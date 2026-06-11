import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch, deleteField } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";
import { Game, Mission, Player, handleFirestoreError, OperationType } from "../types";
import { Settings, Plus, Play, Trash2, ArrowLeft, Copy, Edit2, ChevronDown, ChevronUp, Save, X } from "lucide-react";

export function AdminPanel({ user }: { user: any }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newMissionType, setNewMissionType] = useState<"none" | "code" | "clicker">("none");
  const [newMissionName, setNewMissionName] = useState("");
  const [newMissionPasscode, setNewMissionPasscode] = useState("");
  const [newMissionTaps, setNewMissionTaps] = useState("50");

  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPasscode, setEditPasscode] = useState("");
  const [editTaps, setEditTaps] = useState("");

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

  const addMission = async () => {
    if (newMissionType === "none") return;
    const id = "M" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const name = newMissionName.trim() || `Task ${id}`;
    
    let newMission: Mission;
    if (newMissionType === "code") {
      newMission = {
        name,
        type: "code",
        passcode: newMissionPasscode.trim() || Math.floor(1000 + Math.random() * 9000).toString()
      };
    } else {
      newMission = {
        name,
        type: "clicker",
        clickTarget: parseInt(newMissionTaps, 10) || 50
      };
    }

    try {
      await setDoc(doc(db, `games/${gameId}/missions`, id), newMission);
      setNewMissionName("");
      setNewMissionPasscode("");
      setNewMissionTaps("50");
      setNewMissionType("none");
      toast.success(`Task added. Link: ?tag=${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `games/${gameId}/missions/${id}`);
    }
  };

  const startEditing = (m: Mission) => {
    setEditingMissionId(m.id!);
    setEditName(m.name);
    setEditPasscode(m.passcode || "");
    setEditTaps(String(m.clickTarget || 50));
  };

  const saveEdit = async (m: Mission) => {
    if (!gameId || !m.id) return;
    
    try {
      const updates: any = { name: editName.trim() || m.name };
      
      if (m.type === 'code') {
        if (editPasscode.trim()) {
           updates.passcode = editPasscode.trim().toUpperCase();
        } else {
           updates.passcode = deleteField();
        }
      } else if (m.type === 'clicker') {
        updates.clickTarget = parseInt(editTaps, 10) || m.clickTarget || 50;
      }

      await updateDoc(doc(db, `games/${gameId}/missions/${m.id}`), updates);
      setEditingMissionId(null);
      toast.success("Mission updated.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}/missions/${m.id}`);
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

      const gameSnap = await getDoc(doc(db, "games", gameId));
      let newRound = 1;
      if (gameSnap.exists()) {
        newRound = (gameSnap.data().round || 0) + 1;
      }

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
             tasks = mShuffled.slice(0, numTasks).map(mId => ({ missionId: mId, completed: false, round: newRound }));
          }

          batch.update(doc(db, `games/${gameId}/players`, shuffled[i].id), { 
            role,
            status: "alive",
            round: newRound,
            tasks
          });
        }
      }

      batch.update(doc(db, "games", gameId), {
        status: "playing",
        winner: null,
        round: newRound,
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
    return `${url.protocol}//${url.host}${import.meta.env.BASE_URL}scan/${missionId}?g=${gameId}`;
  };

  const getPlayerKillUrl = (playerId: string) => {
    const url = new URL(window.location.href);
    return `${url.protocol}//${url.host}${import.meta.env.BASE_URL}scan/${playerId}?g=${gameId}`;
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
               <div key={m.id} className="bg-zinc-950 p-4 rounded-xl flex flex-col border border-zinc-800 transition-all">
                 <div className="flex items-center justify-between">
                   <div className="flex-1 min-w-0 pr-4">
                     <p className="font-bold text-zinc-200">
                       {m.name} 
                       {m.type === 'code' && m.passcode && <span className="ml-2 text-xs font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{m.passcode}</span>}
                       {m.type === 'clicker' && <span className="ml-2 text-xs font-mono text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">{m.clickTarget} TAPS</span>}
                     </p>
                     <div className="flex items-center gap-2 mt-1">
                       <p className="text-[10px] text-zinc-500 font-mono opacity-70 truncate max-w-[200px] sm:max-w-[250px] select-all">
                         {getScanUrl(m.id!)}
                       </p>
                       <button onClick={() => copyToClipboard(getScanUrl(m.id!))} className="text-zinc-400 hover:text-blue-500 transition-colors p-1 cursor-pointer shrink-0">
                         <Copy size={14} />
                       </button>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => editingMissionId === m.id ? setEditingMissionId(null) : startEditing(m)} className="text-blue-500 p-2 hover:bg-blue-500/20 rounded-full transition-colors cursor-pointer shrink-0">
                       {editingMissionId === m.id ? <ChevronUp size={16} /> : <Edit2 size={16} />}
                     </button>
                     <button onClick={() => removeMission(m.id!)} className="text-red-500 p-2 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer shrink-0">
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
                 
                 {editingMissionId === m.id && (
                   <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Mission Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-bold tracking-wider rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      
                      {m.type === 'code' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Secret Code / Sequence</label>
                          <input
                            type="text"
                            value={editPasscode}
                            onChange={(e) => setEditPasscode(e.target.value.toUpperCase())}
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-bold tracking-wider rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 uppercase"
                            placeholder="Leave empty for none"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Required Taps (10-500)</label>
                          <input
                            type="number"
                            value={editTaps}
                            onChange={(e) => setEditTaps(e.target.value)}
                            min="10" max="500"
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-bold tracking-wider rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingMissionId(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-50 transition-colors">Cancel</button>
                        <button onClick={() => saveEdit(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-blue-500 hover:bg-blue-600 text-white transition-colors">
                           <Save size={14} /> Save
                        </button>
                      </div>
                   </div>
                 )}
               </div>
             ))}
           </div>
         )}
         
         {newMissionType === "none" ? (
           <div className="flex gap-2 flex-wrap sm:flex-nowrap">
             <button onClick={() => setNewMissionType('code')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-blue-500/30 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl font-bold transition-colors cursor-pointer uppercase tracking-widest text-sm">
                <Plus size={18} /> NEW CODE TASK
             </button>
             <button onClick={() => setNewMissionType('clicker')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-orange-500/30 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl font-bold transition-colors cursor-pointer uppercase tracking-widest text-sm">
                <Plus size={18} /> NEW CLICKER TASK
             </button>
           </div>
         ) : (
           <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 ${newMissionType === 'code' ? 'bg-blue-500/5 border-blue-500/30' : 'bg-orange-500/5 border-orange-500/30'}`}>
             <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${newMissionType === 'code' ? 'text-blue-500' : 'text-orange-500'}`}>
                  <Settings size={16} /> NEW {newMissionType.toUpperCase()} TASK
                </h3>
                <button onClick={() => setNewMissionType('none')} className="text-zinc-500 hover:text-zinc-200">
                  <X size={20} />
                </button>
             </div>
             
             <div className="space-y-3">
               <div>
                 <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-1">Mission Name</label>
                 <input
                   type="text"
                   value={newMissionName}
                   onChange={(e) => setNewMissionName(e.target.value)}
                   placeholder={`e.g. ${newMissionType === 'code' ? 'Comms Array Bypass' : 'Stabilize Reactor'}`}
                   className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm font-bold tracking-wider rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-600 transition-colors"
                 />
               </div>
               
               {newMissionType === 'code' ? (
                 <div>
                   <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-1">Passcode / Sequence</label>
                   <input
                     type="text"
                     value={newMissionPasscode}
                     onChange={(e) => setNewMissionPasscode(e.target.value.toUpperCase())}
                     placeholder="e.g. ALPHA9 (Leaves empty for random)"
                     className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm font-bold tracking-wider rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                   />
                 </div>
               ) : (
                 <div>
                   <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase block mb-1">Require Tap Count</label>
                   <input
                     type="number"
                     value={newMissionTaps}
                     onChange={(e) => setNewMissionTaps(e.target.value)}
                     min="10" max="500"
                     className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm font-bold tracking-wider rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                   />
                 </div>
               )}
               
               <button onClick={addMission} className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors cursor-pointer uppercase tracking-widest text-sm mt-2 ${newMissionType === 'code' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                  <Plus size={18} /> CREATE
               </button>
             </div>
           </div>
         )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[16px] mb-8 relative z-10 shadow-2xl">
         <h2 className="text-sm text-zinc-400 mb-4 uppercase font-bold tracking-widest">Emergency Meeting Tag</h2>
         <div className="bg-zinc-950 p-4 rounded-xl flex flex-col border border-zinc-800">
           <div className="flex-1 min-w-0 pr-4">
             <p className="font-bold text-red-500">Central Meeting Point</p>
             <p className="text-xs text-zinc-500 mt-1 mb-3">Scan this tag to immediately halt the simulation and call a tribunal.</p>
             <div className="flex items-center gap-2 mt-1">
               <p className="text-[10px] text-zinc-500 font-mono opacity-70 truncate w-full select-all">
                 {`${window.location.protocol}//${window.location.host}${import.meta.env.BASE_URL}scan/EMERGENCY?g=${gameId}`}
               </p>
               <button onClick={() => copyToClipboard(`${window.location.protocol}//${window.location.host}${import.meta.env.BASE_URL}scan/EMERGENCY?g=${gameId}`)} className="text-zinc-400 hover:text-red-500 transition-colors p-2 cursor-pointer shrink-0 border border-zinc-800 rounded bg-zinc-900">
                 <Copy size={14} />
               </button>
             </div>
           </div>
         </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[16px] mb-8 relative z-10 shadow-2xl">
         <h2 className="text-sm text-zinc-400 mb-4 uppercase font-bold tracking-widest">Player NFC Tags (Assign to players)</h2>
         <p className="text-xs text-zinc-500 mb-4">Print or encode these links onto NFC tags, and physically distribute them to the registered players. The killer scans them to eliminate the player.</p>
         {players.length === 0 ? (
           <p className="text-sm text-zinc-500 mb-4 font-medium tracking-wide">No operatives detected.</p>
         ) : (
           <div className="flex flex-col gap-3">
             {players.map(p => (
               <div key={p.id} className="bg-zinc-950 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800 gap-3">
                 <div className="flex-1 min-w-0">
                   <p className="font-bold text-zinc-200">{p.name}</p>
                   <div className="flex items-center gap-2 mt-2">
                     <p className="text-[10px] text-zinc-500 font-mono opacity-70 truncate max-w-[200px] sm:max-w-[250px] select-all">
                       {getPlayerKillUrl(p.id!)}
                     </p>
                     <button onClick={() => copyToClipboard(getPlayerKillUrl(p.id!))} className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 cursor-pointer shrink-0 border border-zinc-800 rounded bg-zinc-900">
                       <Copy size={12} />
                     </button>
                   </div>
                 </div>
                 {p.id !== game?.ownerId && game?.status === 'lobby' && (
                   <button onClick={() => removePlayer(p.id!)} className="text-red-500 p-2 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer shrink-0 self-end sm:self-auto border border-red-500/20">
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

      <div className="mt-12 flex justify-center pb-8">
         <button onClick={async () => {
             if (window.confirm("WARNING: This will completely destroy this game room, kick all players, and delete all missions. This cannot be undone. Are you sure?")) {
                 try {
                     const batch = writeBatch(db);
                     players.forEach(p => batch.delete(doc(db, `games/${gameId}/players`, p.id!)));
                     missions.forEach(m => batch.delete(doc(db, `games/${gameId}/missions`, m.id!)));
                     batch.delete(doc(db, "games", gameId!));
                     await batch.commit();
                     toast.success("Game room destroyed.");
                     navigate("/");
                 } catch (e) {
                     toast.error("Failed to delete room.");
                 }
             }
         }} className="text-xs text-red-500/50 hover:text-red-500 font-bold uppercase tracking-widest transition-colors cursor-pointer border border-transparent hover:border-red-500/30 px-4 py-2 rounded">
             DESTROY ROOM & RETURN HOME
         </button>
      </div>
    </div>
  );
}
