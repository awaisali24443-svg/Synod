import React, { useEffect, useRef } from 'react';

// A lightweight, pseudo-random graph visualization using canvas
export function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Graph data
    const nodes = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: i === 0 ? 8 : Math.random() * 3 + 2,
      color: i === 0 ? '#FF003C' : i < 5 ? '#00F3FF' : '#39FF14',
      type: i === 0 ? 'domain' : i < 5 ? 'subdomain' : 'endpoint'
    }));

    const edges = [];
    for (let i = 1; i < nodes.length; i++) {
      // Connect to root or random subdomain
      const target = i < 5 ? 0 : Math.floor(Math.random() * 5);
      edges.push({ source: i, target });
      
      // Random cross connections
      if (Math.random() > 0.8) {
        edges.push({ source: i, target: Math.floor(Math.random() * nodes.length) });
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
        
        const dist = Math.hypot(target.x - source.x, target.y - source.y);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist/150})`;
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
  }, []);

  return (
    <div className="bg-synod-bg-secondary border border-white/10 rounded-xl p-4 flex flex-col h-full relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Knowledge Graph</h2>
        <div className="flex items-center space-x-3 mt-2 text-[10px] font-mono">
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-synod-critical mr-1"></span> Domain</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-synod-ai mr-1"></span> Subdomain</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-synod-accent mr-1"></span> Endpoint</span>
        </div>
      </div>
      
      <div className="flex-1 w-full h-full min-h-[200px] mt-8">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
