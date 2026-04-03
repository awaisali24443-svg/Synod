import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';
import net from 'net';
import Database from 'better-sqlite3';
import { GoogleGenAI, Content } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3000;

// Database Setup
const db = new Database('synod.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    report TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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

async function toolFetchHeaders(url: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => { headers[key] = val; });
    return JSON.stringify({ status: res.status, headers }, null, 2);
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

async function toolTestXss(url: string, payload: string) {
  try {
    const testUrl = `${url}/?q=${encodeURIComponent(payload)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.status === 403 || res.status === 406) {
      return `WAF Blocked the request (Status ${res.status})`;
    }
    const body = await res.text();
    if (body.includes(payload)) {
      return `VULNERABLE: Payload reflected in response body!`;
    }
    return `Safe: Payload sanitized or not reflected.`;
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

async function toolProbePath(url: string, path: string) {
  try {
    const testUrl = `${url}${path.startsWith('/') ? path : '/' + path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(testUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    return `Status: ${res.status}`;
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

async function runAgentLoop(target: string, initialRecon: any, councilAdvice: string, scan_id: string, geminiKey: string) {
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  
  let context = `You are an Autonomous Bug Bounty Agent. Your target is ${target}.
Initial Recon Data:
${JSON.stringify(initialRecon)}

The AI Council has provided the following strategic advice, PoCs, and remediation plans. Use this as your guide:
${councilAdvice}

You have access to the following tools:
1. fetch_http_headers(url: string) - Fetches HTTP headers to check for missing security headers or server info.
2. test_xss_reflection(url: string, payload: string) - Safely tests if a payload is reflected in the HTML (tests for XSS and WAF).
3. probe_sensitive_path(url: string, path: string) - Checks if a specific path (like /.env or /admin) returns a 200 OK.

You must use the "Plan-and-Solve" loop. You have a maximum of 5 attempts.
Respond in this exact format:
<thinking>
1. Analyze the current state and the Council's advice.
2. Formulate a plan.
3. Decide which tool to use next.
</thinking>
<tool_use>
{"name": "tool_name", "args": {"arg1": "value"}}
</tool_use>

If you have found enough vulnerabilities, or if you have reached your 5th attempt, you MUST generate the final report.
Use this format to end the loop:
<thinking>I have gathered enough info.</thinking>
<report>
## Vulnerability Report
[Details...]
## Business Risk Email Template
[Email...]
</report>`;

  let contents: Content[] = [{ role: 'user', parts: [{ text: context }] }];
  let report = "";
  const MAX_ATTEMPTS = 5;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    broadcastLog("AgentLoop", scan_id, "INFO", `Agent Loop Attempt ${i + 1}/${MAX_ATTEMPTS}`);
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: contents
      });
      
      const text = response.text || "";
      contents.push({ role: 'model', parts: [{ text }] });

      const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
      if (thinkingMatch) {
        broadcastLog("AgentLoop", scan_id, "DEBUG", `Thinking:\n${thinkingMatch[1].trim()}`);
      }

      const reportMatch = text.match(/<report>([\s\S]*?)<\/report>/);
      if (reportMatch) {
        report = reportMatch[1].trim();
        broadcastLog("AgentLoop", scan_id, "SUCCESS", "Agent completed its investigation and drafted the report.");
        break;
      }

      const toolMatch = text.match(/<tool_use>([\s\S]*?)<\/tool_use>/);
      if (toolMatch) {
        try {
          const toolCall = JSON.parse(toolMatch[1].trim());
          broadcastLog("AgentLoop", scan_id, "INFO", `Agent used tool: ${toolCall.name} with args ${JSON.stringify(toolCall.args)}`);
          
          let observation = "";
          if (toolCall.name === "fetch_http_headers") {
            observation = await toolFetchHeaders(toolCall.args.url);
          } else if (toolCall.name === "test_xss_reflection") {
            observation = await toolTestXss(toolCall.args.url, toolCall.args.payload);
          } else if (toolCall.name === "probe_sensitive_path") {
            observation = await toolProbePath(toolCall.args.url, toolCall.args.path);
          } else {
            observation = `Error: Unknown tool ${toolCall.name}`;
          }
          
          broadcastLog("AgentLoop", scan_id, "DEBUG", `Observation: ${observation}`);
          const obsText = `<observation>\n${observation}\n</observation>`;
          contents.push({ role: 'user', parts: [{ text: obsText }] });
        } catch (e: any) {
          contents.push({ role: 'user', parts: [{ text: `<observation>Error parsing tool JSON: ${e.message}</observation>` }] });
        }
      } else {
        contents.push({ role: 'user', parts: [{ text: `<observation>You didn't use a tool or provide a <report>. Please provide a <report> now.</observation>` }] });
      }
    } catch (e: any) {
      broadcastLog("AgentLoop", scan_id, "ERROR", `Agent API Error: ${e.message}`);
      break;
    }
  }
  
  if (!report) {
    report = "Agent reached maximum attempts without generating a final report.";
  }
  
  return report;
}

async function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
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

    broadcastLog("ReconAgent", scan_id, "INFO", `Starting Port Scan on common ports...`);
    const commonPorts = [21, 22, 80, 443, 3306, 5432, 8080, 8443];
    const openPorts = [];
    for (const port of commonPorts) {
      if (await checkPort(target, port)) {
        openPorts.push(port);
        broadcastLog("ReconAgent", scan_id, "DEBUG", `Port ${port} is OPEN`);
      }
    }
    state.recon_data.open_ports = openPorts;

    broadcastLog("ReconAgent", scan_id, "INFO", `Finished DNS & Port Recon`);

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

    // 3. AI Council Strategic Planning
    state.status = "council_planning";
    broadcastLog("AnalysisAgent", scan_id, "INFO", "Convening the AI Council for strategic planning...");
    
    let councilAdvice = "";
    const deepseekKey = api_keys?.deepseek || process.env.DEEPSEEK_API_KEY;
    const huggingfaceKey = api_keys?.huggingface || process.env.HUGGINGFACE_API_KEY;
    const anthropicKey = api_keys?.anthropic || process.env.ANTHROPIC_API_KEY;
    
    const baseData = `Target: ${target}. Recon Data: ${JSON.stringify(state.recon_data)}.`;

    const deepseekPrompt = `You are the Lead Security Strategist. Analyze this recon data. Think deeply about complex, chained attack vectors or business logic flaws a hacker might attempt based on these specific exposed services. Focus on high-impact theoretical vulnerabilities.\n\n${baseData}`;
    
    const hfPrompt = `You are the Red Team Validator. Based on this recon data, provide 2-3 SAFE, benign Proof-of-Concept (PoC) payloads that our automated agent can use to safely verify if these services are vulnerable. DO NOT provide destructive exploits.\n\n${baseData}`;
    
    const anthropicPrompt = `You are the Blue Team Defender. Based on this recon data, provide specific, actionable mitigation strategies and patches to secure the target against common attacks on these services.\n\n${baseData}`;

    const councilPromises: Promise<string>[] = [];

    if (deepseekKey) {
      councilPromises.push((async () => {
        try {
          broadcastLog("AnalysisAgent", scan_id, "DEBUG", "DeepSeek (Lead Strategist) is reasoning...");
          const openai = new OpenAI({ apiKey: deepseekKey, baseURL: 'https://api.deepseek.com/v1' });
          const response = await openai.chat.completions.create({
            model: 'deepseek-reasoner',
            messages: [{ role: 'user', content: deepseekPrompt }]
          });
          return `### 🧠 DeepSeek Strategy\n${response.choices[0].message.content}\n`;
        } catch (e: any) {
          broadcastLog("AnalysisAgent", scan_id, "WARNING", `DeepSeek failed: ${e.message}`);
          return "";
        }
      })());
    }

    if (huggingfaceKey) {
      councilPromises.push((async () => {
        try {
          broadcastLog("AnalysisAgent", scan_id, "DEBUG", "Hugging Face (Red Team Validator) is writing PoCs...");
          // Hugging Face offers an OpenAI-compatible API endpoint!
          const hfOpenAI = new OpenAI({ apiKey: huggingfaceKey, baseURL: 'https://api-inference.huggingface.co/v1/' });
          const response = await hfOpenAI.chat.completions.create({
            model: 'Qwen/Qwen2.5-72B-Instruct', // Using a powerful open-source model
            messages: [{ role: 'user', content: hfPrompt }]
          });
          return `### 🎯 Hugging Face (Qwen) PoCs\n${response.choices[0].message.content}\n`;
        } catch (e: any) {
          broadcastLog("AnalysisAgent", scan_id, "WARNING", `Hugging Face failed: ${e.message}`);
          return "";
        }
      })());
    }

    if (anthropicKey) {
      councilPromises.push((async () => {
        try {
          broadcastLog("AnalysisAgent", scan_id, "DEBUG", "Anthropic (Blue Team Defender) is writing patches...");
          const anthropic = new Anthropic({ apiKey: anthropicKey });
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: anthropicPrompt }]
          });
          return `### 🛡️ Anthropic Patches\n${(response.content[0] as any).text}\n`;
        } catch (e: any) {
          broadcastLog("AnalysisAgent", scan_id, "WARNING", `Anthropic failed: ${e.message}`);
          return "";
        }
      })());
    }

    if (councilPromises.length > 0) {
      const results = await Promise.all(councilPromises);
      councilAdvice = results.filter(r => r.length > 0).join('\n---\n\n');
      if (!councilAdvice) councilAdvice = "AI Council failed to generate advice.";
      broadcastLog("AnalysisAgent", scan_id, "INFO", "AI Council strategic planning complete.");
    } else {
      councilAdvice = "No secondary API keys provided. Skipping AI Council planning.";
      broadcastLog("AnalysisAgent", scan_id, "WARNING", "Only Gemini key found. Skipping AI Council planning.");
    }

    // 4. Agentic Loop Analysis (Execution)
    state.status = "analysis";
    broadcastLog("AnalysisAgent", scan_id, "INFO", "Starting Autonomous Agent Loop (Gemini)...");
    
    const geminiKey = api_keys?.gemini || process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      broadcastLog("AnalysisAgent", scan_id, "ERROR", "Gemini API Key is required for the Agent Loop.");
      state.status = "failed";
      return;
    }

    const agentReport = await runAgentLoop(target, state.recon_data, councilAdvice, scan_id, geminiKey);
    
    // 5. The Synthesis Engine (Final Polish)
    state.status = "synthesis";
    broadcastLog("Orchestrator", scan_id, "INFO", "Activating Synthesis Engine to compile final report...");
    
    const synthesisPrompt = `You are the Lead Editor for a top-tier Bug Bounty team.
Target: ${target}

RAW RECON DATA:
${JSON.stringify(state.recon_data, null, 2)}

AI COUNCIL ADVICE:
${councilAdvice}

AGENT FINDINGS:
${agentReport}

Your job is to synthesize all of this into a single, highly professional Bug Bounty Report in Markdown format. 
It must include:
1. Executive Summary
2. Reconnaissance Summary (Ports, DNS, Headers)
3. Technical Details of Findings (Only include what the Agent actually verified or strongly suspects)
4. Remediation & Patches (Use the Blue Team's advice)
5. Business Risk Assessment

Do NOT invent vulnerabilities that the Agent did not find. If the Agent found nothing, state that the target appears secure against the tested vectors.`;

    let finalReport = "";
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const synthesisResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: synthesisPrompt
      });
      finalReport = synthesisResponse.text || agentReport;
      broadcastLog("Orchestrator", scan_id, "SUCCESS", "Synthesis complete.");
    } catch (e: any) {
      broadcastLog("Orchestrator", scan_id, "WARNING", `Synthesis failed, falling back to raw report: ${e.message}`);
      finalReport = `# SYNOD Raw Report\n\n## Council Advice\n${councilAdvice}\n\n## Agent Findings\n${agentReport}`;
    }

    state.vulnerabilities = [{ title: "Synthesized Bug Bounty Report", description: finalReport }];

    // 6. Human Authorization (Review Draft)
    state.status = "pending_auth";
    state.pending_authorization = true;
    broadcastLog("Orchestrator", scan_id, "WARNING", "Draft Report Ready. Waiting for human review and authorization to submit.");

    // Wait for authorization
    while (activeScans[scan_id].pending_authorization) {
      await new Promise(r => setTimeout(r, 1000));
    }

    if (activeScans[scan_id].status === "rejected") {
      broadcastLog("Orchestrator", scan_id, "ERROR", "Report rejected by human.");
      return;
    }

    // 7. Report Generation & Submission
    state.status = "reporting";
    broadcastLog("ReportAgent", scan_id, "INFO", "Finalizing and submitting report...");
    
    state.report = finalReport;
    broadcastLog("ReportAgent", scan_id, "SUCCESS", "Report submitted successfully!");

    state.status = "completed";
    broadcastLog("Orchestrator", scan_id, "INFO", "Pipeline completed successfully.");
    
    // Update DB if this was triggered by the worker
    try {
      const stmt = db.prepare(`UPDATE targets SET status = 'completed', report = ? WHERE url = ? AND status = 'running'`);
      stmt.run(state.report, target);
    } catch (e) {}

  } catch (e: any) {
    state.status = "failed";
    broadcastLog("Orchestrator", scan_id, "ERROR", `Pipeline failed: ${e.message}`);
    try {
      const stmt = db.prepare(`UPDATE targets SET status = 'failed' WHERE url = ? AND status = 'running'`);
      stmt.run(target);
    } catch (dbErr) {}
  }
}

// 24/7 Background Worker
let isWorkerRunning = false;
async function startBackgroundWorker(api_keys?: Record<string, string>) {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  console.log("Started 24/7 Background Worker...");
  
  while (true) {
    try {
      const stmt = db.prepare(`SELECT * FROM targets WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`);
      const targetRecord = stmt.get() as any;
      
      if (targetRecord) {
        console.log(`Worker picked up target: ${targetRecord.url}`);
        const updateStmt = db.prepare(`UPDATE targets SET status = 'running' WHERE id = ?`);
        updateStmt.run(targetRecord.id);
        
        // Run the pipeline and wait for it to finish before picking the next one
        await runPipeline(targetRecord.url, api_keys);
      }
    } catch (e) {
      console.error("Worker error:", e);
    }
    // Wait 5 seconds before checking again
    await new Promise(r => setTimeout(r, 5000));
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
    
    // Sanitize target
    let cleanTarget = target.replace(/^(https?:\/\/)/, '').split('/')[0];

    // Add to database queue
    try {
      const stmt = db.prepare(`INSERT INTO targets (url, status) VALUES (?, 'pending')`);
      stmt.run(cleanTarget);
      
      // Ensure worker is running with the latest keys
      startBackgroundWorker(api_keys);
      
      res.json({ scan_id: "queued", status: "queued", message: "Target added to 24/7 background queue" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/v1/queue", (req, res) => {
    try {
      const stmt = db.prepare(`SELECT * FROM targets ORDER BY created_at DESC LIMIT 50`);
      const targets = stmt.all();
      res.json(targets);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
