import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Game, Player, Mission, handleFirestoreError, OperationType } from "../types";
import { toast } from "react-hot-toast";
import { CheckCircle2, Terminal } from "lucide-react";

export function MissionView({ user }: { user: any }) {
  const { gameId, missionId } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function fetchMission() {
      if (!gameId || !missionId) return;
      try {
        const snap = await getDoc(doc(db, `games/${gameId}/missions/${missionId}`));
        if (snap.exists()) {
          setMission({ id: snap.id, ...snap.data() } as Mission);
        } else {
          toast.error("Invalid mission coordinates.");
          navigate(`/game/${gameId}`);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `games/${gameId}/missions/${missionId}`);
      } finally {
        setLoading(false);
      }
    }
    fetchMission();
  }, [gameId, missionId, navigate]);

  const [clicks, setClicks] = useState(0);
  const clickTarget = 50;

  const submitCodeTask = async (e?: any) => {
    if (e) e.preventDefault();
    if (!gameId || !user || !mission) return;

    if (mission.type === 'code' && mission.passcode && code.trim().toUpperCase() !== mission.passcode.toUpperCase()) {
      toast.error("Invalid sequence.");
      return;
    }
    
    await completeTask();
  };

  const handlePointerDown = () => {
    if (mission?.type !== 'clicker') return;
    const newClicks = clicks + 1;
    setClicks(newClicks);
    if (newClicks >= clickTarget) {
      completeTask();
    }
  };

  const completeTask = async () => {
    try {
      const pRef = doc(db, `games/${gameId}/players`, user.uid);
      const pSnap = await getDoc(pRef);
      if (pSnap.exists()) {
        const pData = pSnap.data() as Player;
        if (pData.tasks) {
           const updatedTasks = pData.tasks.map(t => 
             t.missionId === missionId ? { ...t, completed: true } : t
           );
           await updateDoc(pRef, { tasks: updatedTasks });
        }
      }

      setCompleted(true);
      toast.success("Mission Success");
      setTimeout(() => {
        navigate(`/game/${gameId}`);
      }, 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    }
  };

  if (loading) return <div className="text-white p-8 font-mono">Decoding payload...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans text-zinc-50 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-30 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-zinc-900 border border-blue-500 rounded-[16px] p-8 shadow-2xl relative z-10 overflow-hidden text-center select-none">
        {completed ? (
          <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in">
            <CheckCircle2 size={64} className="text-green-500 mb-4" />
            <h2 className="text-2xl font-bold tracking-widest text-green-500 uppercase">VERIFIED</h2>
            <p className="text-zinc-400 mt-2 text-sm italic">Returning to dashboard...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 text-zinc-50 mb-8 border-b border-zinc-800 pb-4">
              <div className={`text-4xl mb-2 ${mission?.type === 'clicker' ? 'text-orange-500' : 'text-blue-500'}`}>
                <Terminal size={48} />
              </div>
              <h2 className="text-xl font-bold tracking-widest uppercase">{mission?.name}</h2>
            </div>
            
            {mission?.type === 'code' ? (
              <>
                <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                  Enter the override sequence located at this physical checkpoint to register completion.
                </p>

                <form onSubmit={submitCodeTask} className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    placeholder="ENTER SEQUENCE"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950 border border-zinc-800 py-4 px-4 rounded-xl font-bold text-center tracking-widest text-xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors uppercase"
                    autoFocus
                  />
                  <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-full font-bold transition-all shadow-lg text-lg tracking-widest mt-4 cursor-pointer text-white uppercase">
                    TRANSMIT
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                  Reactor overload imminent. Rapidly tap the core to stabilize.
                </p>
                <div className="w-full bg-zinc-950 rounded-full h-4 mb-8 overflow-hidden border border-zinc-800">
                  <div className="bg-orange-500 h-full transition-all duration-75" style={{ width: `${(clicks / clickTarget) * 100}%` }}></div>
                </div>
                <button 
                  onPointerDown={handlePointerDown} 
                  className="w-32 h-32 mx-auto bg-orange-500 hover:bg-orange-400 active:scale-95 active:bg-orange-600 rounded-full font-bold transition-all shadow-[0_0_40px_rgba(249,115,22,0.4)] text-2xl tracking-widest cursor-pointer text-white flex flex-col items-center justify-center border-4 border-orange-400"
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="text-xs uppercase text-orange-200 mb-1">STABILIZE</span>
                  {clicks} / {clickTarget}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
