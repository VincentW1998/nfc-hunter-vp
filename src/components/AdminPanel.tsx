import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";
import { Game, Mission, Player, handleFirestoreError, OperationType } from "../types";
import { Settings, Plus, Play, Trash2, ArrowLeft, Copy } from "lucide-react";

export function AdminPanel({ user }: { user: any }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMissionName, setNewMissionName] = useState("");

  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Game;
        if (data.ownerId !== user.uid) {
          toast.error("Unauthorized entry.");
          navigate("/");
          return;
        }
        setGame(data);
      }
      setLoading(false);
    });

    const unsubMissions = onSnapshot(collection(db, `games/${gameId}/missions`), (snap) => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Mission)));
    });

    const unsubPlayers = onSnapshot(collection(db, `games/${gameId}/players`), (snap) => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });

    return () => { unsub(); unsubMissions(); unsubPlayers(); }
  }, [gameId, user, navigate]);

  const addCodeMission = async () => {
    const id = "M" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const name = newMissionName.trim() || `Task ${id}`;
    const newMission: Mission = {
      name,
      type: "code"
    };
    try {
      await setDoc(doc(db, `games/${gameId}/missions`, id), newMission);
      setNewMissionName("");
      toast.success(`Task added. Scan NFC code mapped to ?tag=${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `games/${gameId}/missions/${id}`);
    }
  };

  const removeMission = async (mId: string) => {
    try {
      await deleteDoc(doc(db, `games/${gameId}/missions`, mId));
      toast.success("Mission deleted.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `games/${gameId}/missions/${mId}`);
    }
  };

  const removePlayer = async (pId: string) => {
    try {
      await deleteDoc(doc(db, `games/${gameId}/players`, pId));
      toast.success("Operative removed.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `games/${gameId}/players/${pId}`);
    }
  };

  const abortGame = async () => {
    if (!gameId) return;
    try {
      const batch = writeBatch(db);
      
      const playersRef = collection(db, `games/${gameId}/players`);
      const snap = await getDocs(playersRef);
      snap.docs.forEach(d => {
        batch.update(doc(db, `games/${gameId}/players`, d.id), {
          role: "unassigned",
          status: "alive",
          tasks: []
        });
      });

      batch.update(doc(db, "games", gameId), {
        status: "lobby",
        winner: null,
        updatedAt: Date.now()
      });

      await batch.commit();
      toast.success("Deployment Aborted. Returned to Lobby.");
    } catch (err) {
      console.error("ABORT GAME ERROR", err);
      handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    }
  };

  const startGame = async () => {
    if (!gameId) return;
    try {
      const batch = writeBatch(db);

      // Fetch all players to assign roles
      const playersRef = collection(db, `games/${gameId}/players`);
      const snap = await getDocs(playersRef);
      const playerDocs = snap.docs;
      
      // Fetch all missions
      const missionsRef = collection(db, `games/${gameId}/missions`);
      const mSnap = await getDocs(missionsRef);
      const allMissionIds = mSnap.docs.map(m => m.id);
      
      if (playerDocs.length > 0) {
        const shuffled = [...playerDocs].sort(() => 0.5 - Math.random());
        // 1 killer for every 4 players, minimum 1
        const numKillers = Math.max(1, Math.floor(shuffled.length / 4));
        
        for (let i = 0; i < shuffled.length; i++) {
          const isKiller = i < numKillers;
          const role = isKiller ? "killer" : "crewmate";
          
          let tasks: any[] = [];
          if (!isKiller && allMissionIds.length > 0) {
             const mShuffled = [...allMissionIds].sort(() => 0.5 - Math.random());
             const numTasks = Math.min(3, mShuffled.length); // Give each up to 3 tasks
             tasks = mShuffled.slice(0, numTasks).map(mId => ({ missionId: mId, completed: false }));
          }

          batch.update(doc(db, `games/${gameId}/players`, shuffled[i].id), { 
            role,
            status: "alive",
            tasks
          });
        }
      }

      batch.update(doc(db, "games", gameId), {
        status: "playing",
        winner: null,
        updatedAt: Date.now()
      });

      await batch.commit();

      toast.success("Deployment Active.");
      navigate(`/game/${gameId}`);
    } catch (err) {
      console.error("START GAME ERROR", err);
      handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    }
  };

  const getScanUrl = (missionId: string) => {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.host}${url.pathname}#/game/${gameId}/mission/${missionId}`;
  };

  const getPlayerKillUrl = (playerId: string) => {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.host}${url.pathname}#/game/${gameId}/kill/${playerId}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) return <div className="text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-50 max-w-2xl mx-auto relative relative">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-30 pointer-events-none"></div>

      <div className="flex items-center gap-4 mb-8 relative z-10">
        <button onClick={() => navigate(`/lobby/${gameId}`)} className="p-2 hover:bg-zinc-900 rounded-full cursor-pointer transition-colors border border-transparent hover:border-zinc-800">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
          <Settings className="text-blue-500" />
          CMD CENTER: <span className="text-zinc-500">{gameId}</span>
        </h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[16px] mb-8 relative z-10 shadow-2xl">
         <h2 className="text-sm text-zinc-400 mb-4 uppercase font-bold tracking-widest">Mission Payload</h2>
         {missions.length === 0 ? (
           <p className="text-sm text-zinc-500 mb-4 font-medium tracking-wide">No payload targets defined.</p>
         ) : (
           <div className="flex flex-col gap-3 mb-6">
             {missions.map(m => (
               <div key={m.id} className="bg-zinc-950 p-4 rounded-xl flex items-center justify-between border border-zinc-800">
                 <div className="flex-1 min-w-0 pr-4">
                   <p className="font-bold text-zinc-200">{m.name}</p>
                   <div className="flex items-center gap-2 mt-1">
                     <p className="text-xs text-zinc-500 font-mono opacity-70 truncate max-w-[200px] sm:max-w-md select-all">
                       {getScanUrl(m.id!)}
                     </p>
                     <button onClick={() => copyToClipboard(getScanUrl(m.id!))} className="text-zinc-400 hover:text-blue-500 transition-colors p-1 cursor-pointer shrink-0">
                       <Copy size={14} />
                     </button>
                   </div>
                 </div>
                 <button onClick={() => removeMission(m.id!)} className="text-red-500 p-2 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer shrink-0">
                   <Trash2 size={16} />
                 </button>
               </div>
             ))}
           </div>
         )}
         
         <div className="flex gap-2">
           <input
             type="text"
             value={newMissionName}
             onChange={(e) => setNewMissionName(e.target.value)}
             placeholder="Custom Mission Name..."
             className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm font-bold tracking-wider rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
           />
           <button onClick={addCodeMission} className="flex items-center justify-center gap-2 px-6 py-3 border border-blue-500/30 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl font-bold transition-colors cursor-pointer uppercase tracking-widest text-sm shrink-0">
              <Plus size={18} /> GENERATE
           </button>
         </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[16px] mb-8 relative z-10 shadow-2xl">
         <h2 className="text-sm text-zinc-400 mb-4 uppercase font-bold tracking-widest">Player NFC Tags (Assign to players)</h2>
         {players.length === 0 ? (
           <p className="text-sm text-zinc-500 mb-4 font-medium tracking-wide">No operatives detected.</p>
         ) : (
           <div className="flex flex-col gap-3">
             {players.map(p => (
               <div key={p.id} className="bg-zinc-950 p-4 rounded-xl flex items-center justify-between border border-zinc-800">
                 <div className="flex-1 min-w-0 pr-4">
                   <p className="font-bold text-zinc-200">{p.name}</p>
                   <div className="flex items-center gap-2 mt-1">
                     <p className="text-[10px] text-zinc-500 font-mono opacity-70 truncate w-full select-all">
                       {getPlayerKillUrl(p.id!)}
                     </p>
                     <button onClick={() => copyToClipboard(getPlayerKillUrl(p.id!))} className="text-zinc-400 hover:text-blue-500 transition-colors p-1 cursor-pointer shrink-0">
                       <Copy size={14} />
                     </button>
                   </div>
                 </div>
                 {p.id !== game?.ownerId && game?.status === 'lobby' && (
                   <button onClick={() => removePlayer(p.id!)} className="text-red-500 p-2 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer shrink-0">
                     <Trash2 size={16} />
                   </button>
                 )}
               </div>
             ))}
           </div>
         )}
      </div>

      <div className="flex flex-col gap-4 relative z-10 shadow-2xl">
        {game?.status === "lobby" ? (
          <button onClick={startGame} className="flex font-bold items-center justify-center gap-2 w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-transform hover:scale-[1.02] cursor-pointer uppercase tracking-widest">
            <Play size={20} /> INITIATE DEPLOYMENT
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-green-500/20 text-green-500 border border-green-500/30 p-4 rounded-full text-center font-bold tracking-widest uppercase text-sm">
              DEPLOYMENT ACTIVE ({game.status})
            </div>
            <button onClick={abortGame} className="flex font-bold items-center justify-center gap-2 w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full shadow-lg transition-transform hover:scale-[1.02] cursor-pointer uppercase tracking-widest border border-red-500/30">
              ABORT DEPLOYMENT / RETURN TO LOBBY
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
