import React, { useState, useEffect, useRef } from 'react';
import { vibrate, VIBRATION } from '../../utils/vibration';

export function GaugeGame({ onComplete }: { onComplete: () => void }) {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [successCount, setSuccessCount] = useState(0);
  const speed = useRef(2); 
  const targetRequired = 3;
  const gameLoop = useRef<number | null>(null);
  
  const targetZone = { start: 40, end: 60 }; // %

  useEffect(() => {
    let lastTime = performance.now();
    
    const update = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      
      setPosition(prev => {
        let next = prev + (speed.current * direction * (delta / 16)); 
        if (next >= 100) {
          next = 100;
          setDirection(-1);
        } else if (next <= 0) {
          next = 0;
          setDirection(1);
        }
        return next;
      });
      
      gameLoop.current = requestAnimationFrame(update);
    };
    
    gameLoop.current = requestAnimationFrame(update);
    return () => {
      if (gameLoop.current) cancelAnimationFrame(gameLoop.current);
    };
  }, [direction]);

  const handlePress = () => {
    if (position >= targetZone.start && position <= targetZone.end) {
      vibrate(VIBRATION.tap);
      setSuccessCount(prev => {
        const next = prev + 1;
        if (next >= targetRequired) {
           if (gameLoop.current) cancelAnimationFrame(gameLoop.current);
           setTimeout(onComplete, 500);
        } else {
           // increase speed
           speed.current += 1.5;
        }
        return next;
      });
    } else {
      // Missed
      vibrate(VIBRATION.error);
      setSuccessCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="w-full flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-8 flex flex-col items-center">
         
         <div className="flex gap-2 mb-8">
            {Array.from({ length: targetRequired }).map((_, i) => (
              <div key={i} className={`w-10 h-4 rounded ${i < successCount ? 'bg-green-500' : 'bg-zinc-800'}`}></div>
            ))}
         </div>
         
         <div className="w-full h-12 bg-zinc-950 rounded-full border border-zinc-700 relative overflow-hidden mb-8">
            {/* Target zone */}
            <div className="absolute top-0 bottom-0 bg-green-500/30 border-x border-green-500" 
                 style={{ left: `${targetZone.start}%`, width: `${targetZone.end - targetZone.start}%` }} />
                 
            {/* Moving needle */}
            <div className="absolute top-0 bottom-0 w-2 bg-white -ml-1 shadow-[0_0_10px_white]" 
                 style={{ left: `${position}%` }} />
         </div>
         
         <button 
            onPointerDown={handlePress}
            className="w-32 h-32 bg-blue-500 hover:bg-blue-400 active:scale-95 active:bg-blue-600 rounded-full font-bold transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] text-xl tracking-widest cursor-pointer text-white flex flex-col items-center justify-center border-4 border-blue-400"
            style={{ touchAction: 'manipulation' }}
         >
            STABILIZE
         </button>
      </div>
    </div>
  );
}
