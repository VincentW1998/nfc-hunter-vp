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

  return (
    <div className="w-full flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 flex flex-col items-center">
         
         <p className="text-zinc-400 mb-6 text-sm text-center font-bold tracking-widest uppercase">
           Balance both O2 tanks to {targetValue}%
         </p>
         
         <div className="flex justify-between w-full gap-8 h-48">
            <div className="flex-1 flex flex-col items-center justify-end bg-zinc-950 border border-zinc-700 rounded-xl relative overflow-hidden">
               <div className="w-full bg-cyan-500 transition-all duration-100 opacity-80" style={{ height: `${leftValue}%` }}>
                 <div className="absolute top-2 w-full text-center text-white text-xs font-bold mix-blend-difference">{leftValue}%</div>
               </div>
               {/* Target line */}
               <div className="absolute top-1/2 w-full h-0.5 bg-red-500/50"></div>
               
               {/* Invisible slider over the top */}
               <input 
                 type="range" 
                 min="0" max="100" 
                 value={leftValue} 
                 onChange={(e) => { setLeftValue(parseInt(e.target.value)); vibrate(VIBRATION.tap); }}
                 className="absolute inset-0 w-[400%] h-full opacity-0 origin-bottom-left -rotate-90 translate-y-full cursor-ns-resize"
                 // Rotation is tricky with inputs, using a vertical slider css is better if supported
                 style={{ WebkitAppearance: 'slider-vertical' } as any}
               />
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-end bg-zinc-950 border border-zinc-700 rounded-xl relative overflow-hidden">
               <div className="w-full bg-cyan-500 transition-all duration-100 opacity-80" style={{ height: `${rightValue}%` }}>
                 <div className="absolute top-2 w-full text-center text-white text-xs font-bold mix-blend-difference">{rightValue}%</div>
               </div>
               {/* Target line */}
               <div className="absolute top-1/2 w-full h-0.5 bg-red-500/50"></div>
               
               <input 
                 type="range" 
                 min="0" max="100" 
                 value={rightValue} 
                 onChange={(e) => { setRightValue(parseInt(e.target.value)); vibrate(VIBRATION.tap); }}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                 style={{ WebkitAppearance: 'slider-vertical' } as any}
               />
            </div>
         </div>
      </div>
    </div>
  );
}
