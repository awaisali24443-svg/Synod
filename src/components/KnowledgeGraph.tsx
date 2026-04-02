import React, { useEffect, useRef, useState } from 'react';

// A lightweight, pseudo-random graph visualization using canvas
export function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanData, setScanData] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/scans');
        if (res.ok) {
          const scans = await res.json();
          const activeScan = Object.values(scans).find((s: any) => s.status !== 'failed');
          if (activeScan) {
            setScanData((activeScan as any).recon_data);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Resize canvas to match container
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Generate nodes based on real data
    const nodes: any[] = [];
    const edges: any[] = [];

    if (scanData) {
      // Root node
      nodes.push({
        id: 'root',
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: 0, vy: 0,
        radius: 10,
        color: '#FF003C',
        type: 'domain'
      });

      // Domains
      (scanData.domains || []).forEach((d: string, i: number) => {
        nodes.push({
          id: `domain-${i}`,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 6,
          color: '#FF003C',
          type: 'domain'
        });
        edges.push({ source: nodes.length - 1, target: 0 });
      });

      // URLs
      (scanData.urls || []).forEach((u: string, i: number) => {
        nodes.push({
          id: `url-${i}`,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 4,
          color: '#00F3FF',
          type: 'subdomain'
        });
        edges.push({ source: nodes.length - 1, target: 0 });
      });

      // IPs (from DNS A records)
      (scanData.dns?.A || []).forEach((ip: string, i: number) => {
        nodes.push({
          id: `ip-${i}`,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 3,
          color: '#39FF14',
          type: 'endpoint'
        });
        edges.push({ source: nodes.length - 1, target: 0 });
      });
    }

    // Fallback if no data
    if (nodes.length === 0) {
      for(let i=0; i<10; i++) {
        nodes.push({
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: 2,
          color: '#444',
          type: 'endpoint'
        });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
      });

      // Draw edges
      ctx.lineWidth = 0.5;
      edges.forEach(edge => {
        const source = nodes[edge.source];
        const target = nodes[edge.target];
        
        if (!source || !target) return;

        const dist = Math.hypot(target.x - source.x, target.y - source.y);
        if (dist < 200) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist/200})`;
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Glow effect for important nodes
        if (node.type !== 'endpoint') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = node.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [scanData]);

  return (
    <div className="bg-synod-bg-secondary border border-white/10 rounded-xl p-4 flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Knowledge Graph</h2>
        <div className="flex items-center space-x-3 mt-2 text-[10px] font-mono">
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-synod-critical mr-1"></span> Domain</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-synod-ai mr-1"></span> URL</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-synod-accent mr-1"></span> IP Address</span>
        </div>
      </div>
      
      <div className="flex-1 w-full h-full min-h-[200px] mt-8">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
