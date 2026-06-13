import React, { useState, useEffect, useRef } from 'react';
import { vibrate, VIBRATION } from '../../utils/vibration';

// Colors for wires
const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e']; // red, blue, yellow, green

export function WiresGame({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'memorize' | 'connect'>('memorize');
  const [timeLeft, setTimeLeft] = useState(10);
  const [leftNodes, setLeftNodes] = useState<string[]>([]);
  const [rightNodes, setRightNodes] = useState<string[]>([]);
  const [connections, setConnections] = useState<Record<number, number>>({});
  const [activeWire, setActiveWire] = useState<{ startIdx: number, color: string } | null>(null);

  const [pointerPos, setPointerPos] = useState<{ x: number, y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rightRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Shuffle colors for left and right
    setLeftNodes([...COLORS].sort(() => Math.random() - 0.5));
    setRightNodes([...COLORS].sort(() => Math.random() - 0.5));
  }, []);

  useEffect(() => {
    if (phase === 'memorize') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPhase('connect');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  const getRelativePos = (element: HTMLElement | null) => {
     if (!element || !containerRef.current) return { x: 0, y: 0 };
     const rect = element.getBoundingClientRect();
     const containerRect = containerRef.current.getBoundingClientRect();
     return {
       x: rect.left - containerRect.left + rect.width / 2,
       y: rect.top - containerRect.top + rect.height / 2
     };
  };

  const handlePointerDownLeft = (idx: number, e: React.PointerEvent) => {
    if (phase !== 'connect') return;
    
    // If already connected, disconnect it
    if (connections[idx] !== undefined) {
      const newConns = { ...connections };
      delete newConns[idx];
      setConnections(newConns);
      vibrate(VIBRATION.tap);
    }
    setActiveWire({ startIdx: idx, color: leftNodes[idx] });
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
       setPointerPos({
         x: e.clientX - containerRect.left,
         y: e.clientY - containerRect.top
       });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeWire && containerRef.current) {
      // Prevent scrolling while drawing wires
      e.preventDefault();
      const containerRect = containerRef.current.getBoundingClientRect();
      setPointerPos({
        x: Math.max(0, Math.min(containerRect.width, e.clientX - containerRect.left)),
        y: Math.max(0, Math.min(containerRect.height, e.clientY - containerRect.top)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (phase !== 'connect' || !activeWire) return;
    
    let droppedIdx = -1;
    rightRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        // generous hit area
        if (e.clientX >= rect.left - 30 && e.clientX <= rect.right + 30 &&
            e.clientY >= rect.top - 30 && e.clientY <= rect.bottom + 30) {
             droppedIdx = idx;
        }
    });
    
    if (droppedIdx !== -1) {
        const startColor = activeWire.color;
        const endColor = rightNodes[droppedIdx];
        if (startColor === endColor) {
             const newConns = { ...connections, [activeWire.startIdx]: droppedIdx };
             setConnections(newConns);
             vibrate(VIBRATION.tap);
             if (Object.keys(newConns).length === COLORS.length) {
                 setTimeout(onComplete, 500);
             }
        } else {
             vibrate(VIBRATION.error);
        }
    }
    setActiveWire(null);
    setPointerPos(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {phase === 'memorize' && (
        <div className="mb-4 text-center animate-pulse">
           <p className="text-zinc-400 text-sm font-bold tracking-widest uppercase">Memorize locations</p>
           <p className="text-3xl font-bold text-red-500">{timeLeft}s</p>
        </div>
      )}
      {phase === 'connect' && (
        <div className="mb-4 text-center">
           <p className="text-zinc-400 text-sm font-bold tracking-widest uppercase">Match the connections</p>
           <p className="text-3xl font-bold text-green-500">CONNECT</p>
        </div>
      )}

      <div 
        ref={containerRef}
        className={`w-full flex justify-between items-center bg-zinc-900 border-2 ${phase === 'memorize' ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-zinc-700 shadow-inner'} rounded-xl p-8 relative touch-none min-h-[300px] select-none`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="flex flex-col gap-10 z-10 w-full max-w-[50px]">
          {leftNodes.map((color, i) => (
            <div key={`L${i}`} className="flex items-center h-8">
              <div 
                ref={el => leftRefs.current[i] = el}
                onPointerDown={(e) => handlePointerDownLeft(i, e)}
                className={`w-8 h-8 rounded-full border-4 border-zinc-400 shadow-lg ${phase === 'connect' ? 'cursor-pointer active:scale-95' : ''}`} 
                style={{ backgroundColor: color }} 
              />
            </div>
          ))}
        </div>
        
        <div className="flex flex-col gap-10 z-10 w-full max-w-[50px] items-end">
          {rightNodes.map((color, i) => {
            const isConnected = Object.values(connections).includes(i);
            // Hide colors on the right side if we are in connect phase! (unless connected successfully)
            const displayColor = phase === 'memorize' ? color : (isConnected ? color : '#3f3f46');
            return (
              <div key={`R${i}`} className="flex items-center h-8">
                <div 
                  ref={el => rightRefs.current[i] = el}
                  className={`w-8 h-8 rounded-full border-4 border-zinc-400 ${isConnected ? 'opacity-50' : 'hover:border-zinc-300 transition-colors'}`} 
                  style={{ backgroundColor: displayColor }} 
                />
              </div>
            );
          })}
        </div>

        {/* SVG Drawing Layer for the wires */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
           {/* Established connections */}
           {Object.entries(connections).map(([startIdx, endIdx]) => {
              const s = getRelativePos(leftRefs.current[parseInt(startIdx)]);
              const e = getRelativePos(rightRefs.current[endIdx]);
              const color = leftNodes[parseInt(startIdx)];
              return (
                 <line 
                   key={`conn-${startIdx}`}
                   x1={s.x} y1={s.y} 
                   x2={e.x} y2={e.y} 
                   stroke={color} 
                   strokeWidth={12} 
                   strokeLinecap="round"
                   opacity={0.8}
                 />
              );
           })}
           
           {/* Active drawing wire */}
           {activeWire && pointerPos && (
              <line 
                x1={getRelativePos(leftRefs.current[activeWire.startIdx]).x} 
                y1={getRelativePos(leftRefs.current[activeWire.startIdx]).y} 
                x2={pointerPos.x} 
                y2={pointerPos.y} 
                stroke={activeWire.color} 
                strokeWidth={12} 
                strokeLinecap="round"
                opacity={0.9}
              />
           )}
        </svg>
      </div>
    </div>
  );
}
