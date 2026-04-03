import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3000;

// Scan State Management
interface ScanState {
  scan_id: string;
  target: string;
  status: string;
  recon_data: any;
  parsed_data: any;
  vulnerabilities: any[];
  pending_authorization: boolean;
  payloads_to_test: any[];
  report: string;
}

const activeScans: Record<string, ScanState> = {};
const activeConnections: WebSocket[] = [];

function broadcastLog(agent: string, processId: string, level: string, message: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    agent,
    processId,
    level,
    message
  };
  const logStr = JSON.stringify(logEntry);
  activeConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(logStr);
    }
  });
}

async function runPipeline(target: string, api_keys?: Record<string, string>) {
  const scan_id = `scan-${uuidv4().substring(0, 8)}`;
  const state: ScanState = {
    scan_id,
    target,
    status: 'initialized',
    recon_data: { domains: [], urls: [], dns: {} },
    parsed_data: {},
    vulnerabilities: [],
    pending_authorization: false,
    payloads_to_test: [],
    report: ''
  };
  activeScans[scan_id] = state;

  broadcastLog("Orchestrator", scan_id, "INFO", `Started pipeline for ${target}`);

  try {
    // 1. Recon (DNS)
    state.status = "recon";
    broadcastLog("ReconAgent", scan_id, "INFO", `Starting DNS resolution for ${target}`);
    
    const records: any = {};
    try {
      records.A = await dns.resolve4(target);
      broadcastLog("ReconAgent", scan_id, "DEBUG", `Found A records: ${records.A.join(', ')}`);
    } catch (e) {
      broadcastLog("ReconAgent", scan_id, "WARNING", `No A records found for ${target}`);
    }
    
    try {
      records.MX = await dns.resolveMx(target);
      broadcastLog("ReconAgent", scan_id, "DEBUG", `Found MX records: ${records.MX.map(m => m.exchange).join(', ')}`);
    } catch (e) {}

    try {
      records.TXT = await dns.resolveTxt(target);
      broadcastLog("ReconAgent", scan_id, "DEBUG", `Found TXT records: ${records.TXT.map(t => t.join('')).join(' | ')}`);
    } catch (e) {}

    state.recon_data.dns = records;
    state.recon_data.domains = [target]; // In a real scenario, we'd brute-force subdomains here

    broadcastLog("ReconAgent", scan_id, "INFO", `Finished DNS Recon`);

    // 2. Crawl (HTTP Probing)
    state.status = "crawl";
    broadcastLog("CrawlAgent", scan_id, "INFO", `Probing HTTP/HTTPS services on ${target}`);
    const urls = [`http://${target}`, `https://${target}`];
    const activeUrls: string[] = [];
    
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        broadcastLog("CrawlAgent", scan_id, "DEBUG", `${url} [${res.status}] - Server: ${res.headers.get('server') || 'Unknown'}`);
        activeUrls.push(url);
      } catch (e: any) {
        broadcastLog("CrawlAgent", scan_id, "DEBUG", `${url} unreachable: ${e.message}`);
      }
    }
    state.recon_data.urls = activeUrls;

    // 3. AI Analysis
    state.status = "analysis";
    broadcastLog("AnalysisAgent", scan_id, "INFO", "Starting AI analysis on recon data");
    
    let aiAnalysis = "No vulnerabilities found.";
    const geminiKey = api_keys?.gemini || process.env.GEMINI_API_KEY;
    
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const prompt = `You are an expert cybersecurity analyst. Analyze this reconnaissance data for potential security misconfigurations, attack vectors, or interesting findings. Target: ${target}. Data: ${JSON.stringify(state.recon_data)}. Keep it concise and professional.`;
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });
        aiAnalysis = response.text || aiAnalysis;
        broadcastLog("AnalysisAgent", scan_id, "INFO", "AI analysis complete");
      } catch (e: any) {
        broadcastLog("AnalysisAgent", scan_id, "ERROR", `AI Analysis failed: ${e.message}`);
      }
    } else {
      broadcastLog("AnalysisAgent", scan_id, "WARNING", "GEMINI_API_KEY not set. Skipping AI analysis.");
    }
    
    state.vulnerabilities = [{ title: "AI Recon Analysis", description: aiAnalysis }];

    // 4. Human Authorization
    state.status = "pending_auth";
    state.pending_authorization = true;
    broadcastLog("Orchestrator", scan_id, "WARNING", "Pipeline paused. Waiting for human authorization to perform active payload testing.");

    // Wait for authorization
    while (activeScans[scan_id].pending_authorization) {
      await new Promise(r => setTimeout(r, 1000));
    }

    if (activeScans[scan_id].status === "rejected") {
      broadcastLog("Orchestrator", scan_id, "ERROR", "Pipeline rejected by human.");
      return;
    }

    // 5. Payload Testing
    state.status = "payload_testing";
    broadcastLog("PayloadAgent", scan_id, "INFO", "Starting safe payload testing (WAF Check)");
    
    for (const url of activeUrls) {
      try {
        const testUrl = `${url}/?q=<script>alert(1)</script>`;
        broadcastLog("PayloadAgent", scan_id, "DEBUG", `Testing WAF on ${testUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.status === 403 || res.status === 406) {
          broadcastLog("PayloadAgent", scan_id, "INFO", `WAF detected on ${url} (Status: ${res.status})`);
        } else {
          broadcastLog("PayloadAgent", scan_id, "WARNING", `Possible missing WAF on ${url} (Status: ${res.status})`);
        }
      } catch (e: any) {
        broadcastLog("PayloadAgent", scan_id, "DEBUG", `Payload test failed: ${e.message}`);
      }
    }

    // 6. Report Generation
    state.status = "reporting";
    broadcastLog("ReportAgent", scan_id, "INFO", "Generating final report");
    state.report = `# SYNOD Scan Report: ${target}\n\n## Recon Data\n\`\`\`json\n${JSON.stringify(state.recon_data, null, 2)}\n\`\`\`\n\n## AI Analysis\n${aiAnalysis}`;
    broadcastLog("ReportAgent", scan_id, "INFO", "Report generated successfully");

    state.status = "completed";
    broadcastLog("Orchestrator", scan_id, "INFO", "Pipeline completed successfully.");

  } catch (e: any) {
    state.status = "failed";
    broadcastLog("Orchestrator", scan_id, "ERROR", `Pipeline failed: ${e.message}`);
  }
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/v1/scan", (req, res) => {
    const { target, api_keys } = req.body;
    if (!target) {
      return res.status(400).json({ error: "Target is required" });
    }
    
    // Sanitize target (remove http://, https://, and paths)
    let cleanTarget = target.replace(/^(https?:\/\/)/, '').split('/')[0];

    // Clear previous scans so the UI tracks the new one cleanly
    for (const key in activeScans) {
      delete activeScans[key];
    }

    // Fire and forget
    runPipeline(cleanTarget, api_keys);
    res.json({ scan_id: "queued", status: "queued", message: "Scan task added to queue" });
  });

  app.post("/api/v1/authorize", (req, res) => {
    const { scan_id, action } = req.body;
    const state = activeScans[scan_id];
    
    if (!state) {
      return res.status(404).json({ detail: "Scan not found" });
    }
    if (!state.pending_authorization) {
      return res.status(400).json({ detail: "Scan is not pending authorization" });
    }

    if (action === "approve") {
      state.pending_authorization = false;
      state.status = "approved";
      broadcastLog("AuthRouter", scan_id, "INFO", "Human authorization approved.");
      res.json({ status: "approved" });
    } else if (action === "reject") {
      state.pending_authorization = false;
      state.status = "rejected";
      broadcastLog("AuthRouter", scan_id, "WARNING", "Human authorization rejected.");
      res.json({ status: "rejected" });
    } else {
      res.status(400).json({ detail: "Invalid action" });
    }
  });

  app.get("/api/v1/scans", (req, res) => {
    res.json(activeScans);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server setup
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    activeConnections.push(ws);
    ws.on('close', () => {
      const index = activeConnections.indexOf(ws);
      if (index !== -1) {
        activeConnections.splice(index, 1);
      }
    });
  });
}

startServer();
