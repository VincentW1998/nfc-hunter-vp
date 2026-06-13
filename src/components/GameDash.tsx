import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { Game, Player, Mission, handleFirestoreError, OperationType } from "../types";
import { toast } from "react-hot-toast";
import { AlertTriangle, ShieldAlert, CheckCircle2, Circle, Settings } from "lucide-react";
import { vibrate, VIBRATION } from "../utils/vibration";

export function GameDash({ user }: { user: any }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [missions, setMissions] = useState<Record<string, Mission>>({});

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Game;
        setGame(data);
        if (data.status === "voting" || data.status === "meeting") {
          vibrate(VIBRATION.meeting);
          navigate(`/game/${gameId}/vote`);
        }
        if (data.status === "finished" || data.status === "lobby") navigate(`/lobby/${gameId}`);
      }
    });

    const unsubMe = onSnapshot(doc(db, `games/${gameId}/players`, user.uid), (snap) => {
      if(snap.exists()) {
         const p = { id: snap.id, ...snap.data() } as Player;
         setMe(prev => {
            if (prev && prev.status === 'alive' && p.status === 'dead') {
               vibrate(VIBRATION.death);
               toast.error("YOU HAVE BEEN KILLED.", { style: { background: '#ef4444' } });
            }
            return p;
         });
      }
    });

    const unsubAll = onSnapshot(collection(db, `games/${gameId}/players`), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });

    const unsubMissions = onSnapshot(collection(db, `games/${gameId}/missions`), (snap) => {
      const ms: Record<string, Mission> = {};
      snap.docs.forEach(d => {
        ms[d.id] = { id: d.id, ...d.data() } as Mission;
      });
      setMissions(ms);
    });

    return () => { unsubGame(); unsubMe(); unsubAll(); unsubMissions(); }
  }, [gameId, user, navigate]);

  useEffect(() => {
    if (game?.status !== "playing" || me?.id !== game?.ownerId) return;
    
    // Wait for all players to sync to the current round to avoid transient out-of-sync evaluations
    if (players.some(p => p.role !== 'unassigned' && p.round !== game.round)) return;
    
    // Auto-evaluation of Game State
    const aliveCrewmates = players.filter(p => p.role === "crewmate" && p.status === "alive");
    const aliveKillers = players.filter(p => p.role === "killer" && p.status === "alive");

    // Check task completion
    let allTasksDone = false;
    const crewmates = players.filter(p => p.role === "crewmate");
    if (crewmates.length > 0) {
      const totalTasks = Object.keys(missions).length;
      const completedTasks = game.completedMissions?.length || 0;
      if (totalTasks > 0 && totalTasks === completedTasks) {
        allTasksDone = true;
      }
    }

    if ((aliveKillers.length === 0 || allTasksDone) && players.length > 0 && players.some(p => p.role !== 'unassigned')) {
        updateDoc(doc(db, "games", gameId!), { status: "finished", winner: "crewmates" });
        toast.success("CREWMATES WIN!");
    } else if (aliveKillers.length > 0 && aliveCrewmates.length <= aliveKillers.length && players.length > 0 && players.some(p => p.role !== 'unassigned')) {
        updateDoc(doc(db, "games", gameId!), { status: "finished", winner: "killers" });
        toast.error("KILLERS WIN!");
    }
  }, [players, game, me, gameId]);

  if (!game || !me) return <div className="text-white p-8 font-mono">Syncing telemetry...</div>;

  if (me.status === "dead") {
    return (
      <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="text-red-500 mb-6 animate-[pulse_2s_ease-in-out_infinite] scale-150">
             <ShieldAlert size={64}/>
          </div>
          <h1 className="text-4xl font-bold text-red-500 uppercase tracking-widest mb-4">YOU ARE DEAD</h1>
          <p className="text-red-200 mb-8 max-w-sm">
             You have been assassinated. Do not speak. Sit down where you are and wait for a living operative to find your NFC tag to discover your body.
          </p>
          <div className="text-xs font-bold bg-red-900/50 text-red-400 px-6 py-3 rounded-full uppercase tracking-widest border border-red-500/30">
             Ghost Mode Active
          </div>
      </div>
    );
  }

  const isKiller = me.role === "killer";

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-50 flex flex-col pt-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-30 pointer-events-none"></div>

      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/20 z-10">
        <div className="h-full bg-blue-500 animate-[pulse_2s_ease-in-out_infinite] w-1/3"></div>
      </div>

      <div className="flex justify-between items-center mb-12 relative z-10 w-full max-w-md mx-auto">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-zinc-300 flex items-center gap-2">
             NFC HUNTER
             {me.id === game.ownerId && (
                <button onClick={() => navigate(`/admin/${gameId}`)} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 hover:text-blue-500 transition-colors text-zinc-500 cursor-pointer">
                  <Settings size={14} />
                </button>
             )}
          </h1>
          <p className="text-xs text-zinc-500 font-bold tracking-wider mt-1">
            {players.filter(p => p.status === 'alive').length} ALIVE / {players.length} TOTAL
          </p>
        </div>
        <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest ${(me?.status || 'alive') === 'alive' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          {(me?.status || 'alive').toUpperCase()}
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full relative z-10">
        {/* Role Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[16px] p-8 mb-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-500 to-transparent opacity-20"></div>
          <p className="text-zinc-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">Assigned Role</p>
          <h2 className={`text-4xl font-bold tracking-tight mb-2 ${me.role === 'killer' ? 'text-red-500' : 'text-blue-500'}`}>
            {me.role === 'unassigned' ? 'CREWMATE' : me.role.toUpperCase()}
          </h2>
          <p className="text-zinc-500 text-sm">
            {me.role === 'killer' ? 'Eliminate the crew. Avoid detection.' : 'Complete missions. Find the threat.'}
          </p>
        </div>

        {me.role === 'killer' && game.killersKnowEachOther && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-[16px] p-6 mb-8 relative shadow-2xl">
            <h3 className="text-sm text-red-500 font-bold tracking-widest uppercase mb-4 text-center border-b border-red-500/20 pb-2">Assassination Network</h3>
            <div className="flex flex-col gap-3">
              {players.filter(p => p.role === 'killer' && p.id !== me.id).length === 0 ? (
                 <p className="text-xs text-red-400 text-center uppercase tracking-widest">You are the lone operative.</p>
              ) : (
                players.filter(p => p.role === 'killer' && p.id !== me.id).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-red-950/50 rounded-xl border border-red-500/20">
                    <span className={`text-sm font-bold uppercase tracking-wider ${p.status === 'alive' ? 'text-red-400' : 'text-red-900 line-through'}`}>
                      {p.name}
                    </span>
                    {p.status === 'alive' ? (
                      <span className="text-[10px] text-red-500 font-bold px-2 py-1 bg-red-500/10 rounded uppercase tracking-widest">Active</span>
                    ) : (
                      <span className="text-[10px] text-red-900 font-bold px-2 py-1 bg-red-900/10 rounded uppercase tracking-widest">Eliminated</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {me.role === 'crewmate' && Object.keys(missions).length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[16px] p-6 mb-8 relative shadow-2xl">
            <h3 className="text-sm text-zinc-400 font-bold tracking-widest uppercase mb-4 text-center border-b border-zinc-800 pb-2">Global Mission Status</h3>
            <div className="flex flex-col gap-3">
              {Object.values(missions).map((m, idx) => {
                 const isCompleted = game.completedMissions?.includes(m.id!);
                 return (
                   <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                     <span className={`text-sm font-bold ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                       {m?.name || "Unknown Task"}
                     </span>
                     {isCompleted ? (
                       <CheckCircle2 size={18} className="text-green-500" />
                     ) : (
                       <Circle size={18} className="text-zinc-600" />
                     )}
                   </div>
                 );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800">
               <h3 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-2 text-center">Global Crew Progress</h3>
               <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{
                    width: (() => {
                      const totalTasks = Object.keys(missions).length;
                      if (totalTasks === 0) return '0%';
                      const completedTasks = game.completedMissions?.length || 0;
                      return `${(completedTasks / totalTasks) * 100}%`;
                    })()
                  }}></div>
               </div>
            </div>
          </div>
        )}

      </div>

      <div className="mt-auto pt-8 flex flex-col items-center justify-center relative z-10 w-full max-w-md mx-auto pb-4 gap-2">
        <h3 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-2">Network Status</h3>
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {players.map(p => (
            <div key={p.id} className={`px-3 py-1.5 rounded text-xs font-bold tracking-widest uppercase ${p.status === 'alive' ? 'bg-zinc-900 border border-zinc-800 text-zinc-300' : 'bg-red-500/10 border border-red-500/30 text-red-500 line-through'}`}>
              {p.name}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-4 text-center">
          Scanner is Active. Physically scan NFC tags to interact.
        </p>
        
        <CooldownDisplay me={me} />
      </div>
    </div>
  );
}

function CooldownDisplay({ me }: { me: Player }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (me.role !== 'killer' || !me.lastKillTime) return;
    
    const checkTimer = () => {
      const remaining = Math.max(0, 120 - Math.floor((Date.now() - me.lastKillTime!) / 1000));
      setTimeLeft(remaining);
    };
    
    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [me.lastKillTime, me.role]);

  if (me.role !== 'killer') return null;

  return (
    <div className="mt-4 w-full p-4 rounded-xl border flex flex-col items-center justify-center bg-zinc-950 shadow-inner">
      <h3 className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-2">Weapon Status</h3>
      {timeLeft > 0 ? (
        <span className="text-red-500 font-mono text-2xl animate-pulse">COOLING: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
      ) : (
        <span className="text-blue-500 font-mono text-2xl font-bold tracking-widest">WEAPON READY</span>
      )}
    </div>
  );
}
