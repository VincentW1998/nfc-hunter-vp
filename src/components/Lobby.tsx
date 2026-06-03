import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, setDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { Game, Player, handleFirestoreError, OperationType } from "../types";
import { toast } from "react-hot-toast";

export function Lobby({ user }: { user: any }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Game;
        setGame(data);
        if (data.status === "playing") {
          navigate(`/game/${gameId}`);
        }
      } else {
        toast.error("Deployment terminated.");
        navigate("/");
      }
    });

    const unsubPlayers = onSnapshot(collection(db, `games/${gameId}/players`), (snap) => {
      const pList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      setPlayers(pList);
      if (pList.find(p => p.id === user.uid)) {
        setHasJoined(true);
      }
    });

    return () => { unsubGame(); unsubPlayers(); }
  }, [gameId, user, navigate]);

  const joinSquad = async () => {
    if (!gameId) return;
    try {
      const p: Player = {
        name: user.displayName || user.email?.split('@')[0] || "Operative",
        role: "unassigned",
        status: "alive",
        joinTime: Date.now()
      };
      await setDoc(doc(db, `games/${gameId}/players`, user.uid), p);
      toast.success("Identity registered.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `games/${gameId}/players/${user.uid}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-50 flex flex-col items-center relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-30 pointer-events-none"></div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 pt-8">
          <p className="text-blue-500 font-bold mb-2 tracking-widest text-sm uppercase">Lobby Code</p>
          <h1 className="text-5xl font-bold tracking-widest text-zinc-50 tracking-tighter">{gameId}</h1>
          {game?.ownerId === user.uid && (
            <button onClick={() => navigate(`/admin/${gameId}`)} className="mt-4 text-xs font-bold text-zinc-400 hover:text-zinc-50 tracking-wider uppercase underline underline-offset-4 cursor-pointer">
              OPEN COMMAND CENTER
            </button>
          )}
        </div>

        {!hasJoined ? (
          <button onClick={joinSquad} className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-full font-bold mb-8 transition-all shadow-lg text-lg tracking-widest uppercase cursor-pointer">
            REGISTER IDENTITY
          </button>
        ) : game?.status === 'finished' ? (
          <div className={`border p-4 rounded-[16px] mb-8 text-center text-zinc-50 font-bold tracking-widest text-sm uppercase ${game.winner === 'crewmates' ? 'bg-blue-500/20 border-blue-500/50 text-blue-500' : 'bg-red-500/20 border-red-500/50 text-red-500'}`}>
            DEPLOYMENT FINISHED: {game.winner?.toUpperCase()} WON
            <p className="text-zinc-500 text-xs mt-2">Awaiting new deployment from Command Center...</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-[16px] mb-8 text-center text-zinc-400 animate-pulse font-bold tracking-widest text-sm uppercase">
            Awaiting Deployment...
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-[16px] overflow-hidden">
          <div className="bg-zinc-950/50 px-4 py-3 border-b border-zinc-800 text-xs font-bold text-zinc-400 tracking-wider">
            REGISTERED OPERATIVES ({players.length})
          </div>
          <div className="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
            {players.length === 0 ? <p className="text-center text-zinc-500 py-4 text-sm font-bold tracking-wider">No signals detected.</p> : null}
            {players.map(p => (
              <div key={p.id} className="px-4 py-3 border-b border-zinc-800/50 last:border-0 flex items-center justify-between">
                <span className="font-medium text-zinc-200">{p.name}</span>
                {p.id === game?.ownerId && <span className="text-[10px] bg-yellow-400 text-black px-2 py-1 rounded font-bold tracking-wider">ADMIN</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
