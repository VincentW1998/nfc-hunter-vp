import React, { useState, useEffect } from 'react';
import { vibrate, VIBRATION } from '../../utils/vibration';

export function OxygenGame({ onComplete }: { onComplete: () => void }) {
  const [leftValue, setLeftValue] = useState(25);
  const [rightValue, setRightValue] = useState(80);
  const targetValue = 50;
  
  useEffect(() => {
    // Randomize initial values
    setLeftValue(Math.floor(Math.random() * 30));
    setRightValue(Math.floor(Math.random() * 30) + 70);
  }, []);

  useEffect(() => {
    // Both must be exactly 50
    if (leftValue === targetValue && rightValue === targetValue) {
      setTimeout(onComplete, 500);
    }
  }, [leftValue, rightValue, onComplete]);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>, setter: (v: number) => void) => {
    if (e.type === "pointermove" && e.buttons === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawVal = 100 - (y / rect.height) * 100;
    
    // Snap to target to make it reasonable
    let val = Math.max(0, Math.min(100, Math.round(rawVal)));
    if (Math.abs(val - targetValue) < 3) val = targetValue;
    
    setter(val);
    vibrate(VIBRATION.tap);
  }

  return (
    <div className="w-full flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 flex flex-col items-center">
         
         <p className="text-zinc-400 mb-6 text-sm text-center font-bold tracking-widest uppercase">
           Balance both O2 tanks to {targetValue}%
         </p>
         
         <div className="flex justify-between w-full gap-8 h-48">
            <div 
              className="flex-1 flex flex-col items-center justify-end bg-zinc-950 border border-zinc-700 rounded-xl relative overflow-hidden touch-none cursor-ns-resize"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePointer(e, setLeftValue); }}
              onPointerMove={(e) => handlePointer(e, setLeftValue)}
            >
               <div className="w-full bg-cyan-500 opacity-80 pointer-events-none" style={{ height: `${leftValue}%` }}>
                 <div className="absolute top-2 w-full text-center text-white text-xs font-bold mix-blend-difference">{leftValue}%</div>
               </div>
               {/* Target line */}
               <div className="absolute top-1/2 w-full h-0.5 bg-red-500/50 pointer-events-none transform -translate-y-1/2"></div>
            </div>
            
            <div 
              className="flex-1 flex flex-col items-center justify-end bg-zinc-950 border border-zinc-700 rounded-xl relative overflow-hidden touch-none cursor-ns-resize"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePointer(e, setRightValue); }}
              onPointerMove={(e) => handlePointer(e, setRightValue)}
            >
               <div className="w-full bg-cyan-500 opacity-80 pointer-events-none" style={{ height: `${rightValue}%` }}>
                 <div className="absolute top-2 w-full text-center text-white text-xs font-bold mix-blend-difference">{rightValue}%</div>
               </div>
               {/* Target line */}
               <div className="absolute top-1/2 w-full h-0.5 bg-red-500/50 pointer-events-none transform -translate-y-1/2"></div>
            </div>
         </div>
      </div>
    </div>
  );
}
