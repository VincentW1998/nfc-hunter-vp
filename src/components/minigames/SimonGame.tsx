import React, { useState, useEffect, useRef } from 'react';
import { vibrate, VIBRATION } from '../../utils/vibration';

const TILES = Array.from({ length: 9 }).map((_, i) => ({
  id: i,
  color: 'bg-zinc-800 border-2 border-zinc-700',
  active: 'bg-cyan-400 border-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.8)]',
  success: 'bg-green-500 border-green-300 shadow-[0_0_30px_rgba(34,197,94,0.8)]',
  error: 'bg-red-500 border-red-300 shadow-[0_0_30px_rgba(239,68,68,0.8)]',
}));

export function SimonGame({ onComplete }: { onComplete: () => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'failed' | 'success'>('waiting');
  const [round, setRound] = useState(1);
  
  const targetRounds = 3;

  useEffect(() => {
    startNextRound(1);
  }, []);

  const startNextRound = (currentRound: number) => {
    const seqLength = 3 + currentRound; // Round 1 -> 4, 2 -> 5, 3 -> 6
    const newSeq = Array.from({ length: seqLength }).map(() => Math.floor(Math.random() * 9));
    setSequence(newSeq);
    setPlayerSequence([]);
    setGameStatus('playing');
    setRound(currentRound);
    playSequence(newSeq);
  };

  const playSequence = async (seq: number[]) => {
    setIsPlaying(true);
    await new Promise(r => setTimeout(r, 600));
    
    for (let i = 0; i < seq.length; i++) {
       setActiveButton(seq[i]);
       vibrate(VIBRATION.tap);
       await new Promise(r => setTimeout(r, 400));
       setActiveButton(null);
       await new Promise(r => setTimeout(r, 200));
    }
    setIsPlaying(false);
  };

  const handlePress = (id: number) => {
    if (isPlaying || gameStatus !== 'playing') return;
    
    vibrate(VIBRATION.tap);
    setActiveButton(id);
    setTimeout(() => setActiveButton(null), 200);
    
    const newPlayerSeq = [...playerSequence, id];
    setPlayerSequence(newPlayerSeq);
    
    const isCorrect = newPlayerSeq.every((val, index) => val === sequence[index]);
    
    if (!isCorrect) {
      setGameStatus('failed');
      vibrate(VIBRATION.error);
      setTimeout(() => {
         startNextRound(1); // Restart from scratch
      }, 1000);
      return;
    }
    
    if (newPlayerSeq.length === sequence.length) {
      setGameStatus('success');
      vibrate(VIBRATION.success);
      if (round >= targetRounds) {
        setTimeout(onComplete, 1000);
      } else {
        setTimeout(() => startNextRound(round + 1), 1000);
      }
    }
  };

  return (
    <div className="w-full flex justify-center items-center p-4">
      <div className="bg-zinc-900 border-4 border-zinc-800 rounded-2xl p-6 sm:p-10 relative">
         <div className="grid grid-cols-3 gap-3 sm:gap-4">
           {TILES.map((c) => (
             <div 
               key={c.id}
               className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl cursor-pointer transition-all duration-100 ${gameStatus === 'success' ? c.success : gameStatus === 'failed' ? c.error : activeButton === c.id ? c.active : c.color} ${isPlaying || gameStatus !== 'playing' ? 'opacity-80 pointer-events-none' : 'hover:bg-zinc-700 active:scale-95'}`}
               onPointerDown={() => handlePress(c.id)}
             />
           ))}
         </div>
         
         {/* Center display has been removed since 3x3 doesn't leave an empty center, moving info to top/bottom */}
         <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
            {gameStatus === 'failed' ? (
               <span className="text-red-500 font-bold tracking-widest text-lg animate-pulse">SEQUENCE FAILED</span>
            ) : gameStatus === 'success' ? (
               <span className="text-green-500 font-bold tracking-widest text-lg animate-pulse">{round >= targetRounds ? 'SYSTEM UNLOCKED' : 'STAGE CLEARED'}</span>
            ) : (
               <span className="text-zinc-400 font-mono font-bold tracking-widest bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                 STAGE {round} / {targetRounds}
               </span>
            )}
         </div>
      </div>
    </div>
  );
}
