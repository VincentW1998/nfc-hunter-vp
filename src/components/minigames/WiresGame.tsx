import React, { useState, useEffect, useRef } from 'react';
import { vibrate, VIBRATION } from '../../utils/vibration';

// Colors for wires
const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e']; // red, blue, yellow, green

export function WiresGame({ onComplete }: { onComplete: () => void }) {
  const [leftNodes, setLeftNodes] = useState<string[]>([]);
  const [rightNodes, setRightNodes] = useState<string[]>([]);
  const [connections, setConnections] = useState<Record<number, number>>({});
  const [activeWire, setActiveWire] = useState<{ startIdx: number, color: string } | null>(null);

  useEffect(() => {
    // Shuffle colors for left and right
    setLeftNodes([...COLORS].sort(() => Math.random() - 0.5));
    setRightNodes([...COLORS].sort(() => Math.random() - 0.5));
  }, []);

  const handleNodeDown = (idx: number, side: 'left' | 'right') => {
    if (side === 'left') {
      // If already connected, disconnect it
      if (connections[idx] !== undefined) {
        const newConns = { ...connections };
        delete newConns[idx];
        setConnections(newConns);
        vibrate(VIBRATION.tap);
      }
      setActiveWire({ startIdx: idx, color: leftNodes[idx] });
    }
  };

  const handleNodeUp = (idx: number, side: 'left' | 'right') => {
    if (activeWire && side === 'right') {
      const startColor = activeWire.color;
      const endColor = rightNodes[idx];
      
      // if colors match, make connection
      if (startColor === endColor) {
        const newConns = { ...connections, [activeWire.startIdx]: idx };
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
  };

  return (
    <div className="w-full flex justify-between items-center bg-zinc-900 border-2 border-zinc-700 rounded-xl p-8 relative touch-none shadow-inner min-h-[300px]">
      <div className="flex flex-col gap-10 z-10 w-full max-w-[50px]">
        {leftNodes.map((color, i) => (
          <div key={`L${i}`} className="flex items-center">
            <div 
              onPointerDown={(e) => { e.preventDefault(); handleNodeDown(i, 'left'); }}
              className="w-8 h-8 rounded-full border-4 border-zinc-400 cursor-pointer shadow-lg active:scale-95" 
              style={{ backgroundColor: color }} 
            />
            {connections[i] !== undefined && (
               <div className="absolute left-[82px] right-[82px] h-3 pointer-events-none" style={{
                 backgroundColor: color,
                 opacity: 0.8,
                 top: `${48 + i * 72}px`,
                 transformOrigin: 'left center',
                 // Calculate angle and width
                 width: 'calc(100% - 164px)', 
                 // Simple hack for straight lines for now, or just indicate it's connected
               }}>
                 <div className="w-full h-full text-center text-[10px] text-white/50 bg-black/20 flex items-center justify-center tracking-widest font-bold">CONNECTED</div>
               </div>
            )}
            {connections[i] === undefined && activeWire?.startIdx === i && (
               <div className="absolute left-[82px] w-[50%] h-3 pointer-events-none animate-pulse" style={{ backgroundColor: color, top: `${48 + i * 72}px` }}></div>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex flex-col gap-10 z-10 w-full max-w-[50px] items-end">
        {rightNodes.map((color, i) => {
          const isConnected = Object.values(connections).includes(i);
          return (
            <div key={`R${i}`} className="flex items-center">
              <div 
                onPointerUp={() => handleNodeUp(i, 'right')}
                className={`w-8 h-8 rounded-full border-4 border-zinc-400 ${isConnected ? 'opacity-50' : 'cursor-pointer hover:border-white'}`} 
                style={{ backgroundColor: color }} 
              />
            </div>
          );
        })}
      </div>
      
      {/* Central panel indicator */}
      <div className="absolute inset-x-20 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none opacity-20">
         <div className="text-4xl font-bold tracking-[0.5em] text-zinc-500 transform rotate-90 sm:rotate-0">ELECTRICAL</div>
      </div>
    </div>
  );
}
