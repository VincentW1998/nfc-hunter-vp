import React, { useState, useEffect, useRef } from 'react';

const COLORS = [
  { id: 0, color: 'bg-red-500', active: 'bg-red-400 shadow-[0_0_30px_rgba(239,68,68,0.8)]' },
  { id: 1, color: 'bg-blue-500', active: 'bg-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.8)]' },
  { id: 2, color: 'bg-yellow-500', active: 'bg-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.8)]' },
  { id: 3, color: 'bg-green-500', active: 'bg-green-400 shadow-[0_0_30px_rgba(34,197,94,0.8)]' },
];

export function SimonGame({ onComplete }: { onComplete: () => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'failed'>('waiting');
  
  const nextTarget = 4; // Length of sequence to win

  useEffect(() => {
    // Start first sequence
    startNextRound([]);
  }, []);

  const startNextRound = (currentSeq: number[]) => {
    const newSeq = [...currentSeq, Math.floor(Math.random() * 4)];
    setSequence(newSeq);
    setPlayerSequence([]);
    setGameStatus('playing');
    playSequence(newSeq);
  };

  const playSequence = async (seq: number[]) => {
    setIsPlaying(true);
    // Wait before playing
    await new Promise(r => setTimeout(r, 600));
    
    for (let i = 0; i < seq.length; i++) {
       setActiveButton(seq[i]);
       await new Promise(r => setTimeout(r, 400));
       setActiveButton(null);
       await new Promise(r => setTimeout(r, 200));
    }
    setIsPlaying(false);
  };

  const handlePress = (id: number) => {
    if (isPlaying || gameStatus !== 'playing') return;
    
    setActiveButton(id);
    setTimeout(() => setActiveButton(null), 200);
    
    const newPlayerSeq = [...playerSequence, id];
    setPlayerSequence(newPlayerSeq);
    
    // Check if correct
    const isCorrect = newPlayerSeq.every((val, index) => val === sequence[index]);
    
    if (!isCorrect) {
      setGameStatus('failed');
      setTimeout(() => {
         startNextRound([]); // Restart from scratch
      }, 1000);
      return;
    }
    
    // If finished current sequence
    if (newPlayerSeq.length === sequence.length) {
      if (sequence.length >= nextTarget) {
        setTimeout(onComplete, 500);
      } else {
        setTimeout(() => startNextRound(sequence), 800);
      }
    }
  };

  return (
    <div className="w-full flex justify-center items-center p-4">
      <div className="bg-zinc-900 border-4 border-zinc-800 rounded-full p-6 sm:p-10 relative">
         <div className="grid grid-cols-2 gap-4 sm:gap-6">
           {COLORS.map((c) => (
             <div 
               key={c.id}
               className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl cursor-pointer transition-all duration-100 ${activeButton === c.id ? c.active : c.color} ${isPlaying ? 'opacity-80 pointer-events-none' : 'hover:scale-105 active:scale-95'}`}
               onPointerDown={() => handlePress(c.id)}
             />
           ))}
         </div>
         
         {/* Center display */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 bg-zinc-950 rounded-full border-4 border-zinc-800 flex items-center justify-center">
            {gameStatus === 'failed' ? (
               <span className="text-red-500 font-bold text-xl">ERR</span>
            ) : (
               <span className="text-zinc-500 font-mono font-bold">{sequence.length} / {nextTarget}</span>
            )}
         </div>
      </div>
    </div>
  );
}
