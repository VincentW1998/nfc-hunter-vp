import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc, collection, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Game, Player, handleFirestoreError, OperationType } from "../types";
import { toast } from "react-hot-toast";

export function VotingView({ user }: { user: any }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [me, setMe] = useState<Player | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Game;
        setGame(data);
        if (data.status === "playing") navigate(`/game/${gameId}`);
      }
    });

    const unsubAll = onSnapshot(collection(db, `games/${gameId}/players`), (snap) => {
      const pList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      setPlayers(pList);
      const myData = pList.find(p => p.id === user.uid);
      if (myData) setMe(myData);
    });

    return () => { unsubGame(); unsubAll(); }
  }, [gameId, user, navigate]);

  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (game?.status !== "voting") return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (game.ownerId === user.uid) {
            endMeeting();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [game?.status, game?.ownerId, user.uid]);

  const castVote = async (targetId: string) => {
    if (!gameId || !me || me.status !== "alive") return;
    try {
      await updateDoc(doc(db, `games/${gameId}/players`, user.uid), {
        votedFor: targetId
      });
      toast.success("Vote registered.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}/players/${user.uid}`);
    }
  };

  const endMeeting = async () => {
    if (!gameId || game?.ownerId !== user.uid) return;
    // Calculate votes
    const votes: Record<string, number> = {};
    players.forEach(p => {
      if (p.votedFor) {
        votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
      }
    });
    
    // Find max
    let eliminatedId = null;
    let maxVotes = 0;
    for (const [votedId, qty] of Object.entries(votes)) {
      if (qty > maxVotes && votedId !== 'skip') {
        maxVotes = qty;
        eliminatedId = votedId;
      }
    }

    try {
      // Reset votes and go back to playing
      const batch = writeBatch(db);
      if (eliminatedId) {
        batch.update(doc(db, `games/${gameId}/players`, eliminatedId), {
          status: "eliminated"
        });
        toast.error("A player was eliminated.");
      }
      
      players.forEach((p) => {
         batch.update(doc(db, `games/${gameId}/players`, p.id!), { votedFor: "" });
      });

      batch.update(doc(db, "games", gameId), {
        status: "playing",
        updatedAt: Date.now()
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
    }
  };

  if (!game || !me) return <div className="text-white p-8 font-mono">Syncing...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-50 flex flex-col items-center pt-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-30 pointer-events-none"></div>

      <h1 className="text-3xl text-red-500 font-bold tracking-widest mb-2 uppercase animate-pulse text-center relative z-10">EMERGENCY MEETING</h1>
      <div className="flex items-center justify-center gap-2 relative z-10 mb-2">
         <span className="text-red-400 font-bold tracking-widest text-lg uppercase border border-red-500/30 bg-red-500/10 py-2 px-4 rounded-full">
           RENDEZ-VOUS AU CHECK POINT !
         </span>
      </div>
      <p className="text-red-500 font-bold text-2xl mb-8 relative z-10 font-mono">00:{timeLeft.toString().padStart(2, '0')}</p>
      <p className="text-zinc-400 mb-8 max-w-sm text-center relative z-10">Discuss and eliminate the threat.</p>
      
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[16px] p-4 shadow-2xl mb-8 relative z-10">
         <div className="flex flex-col gap-2">
            {players.map(p => (
              <button 
                key={p.id}
                onClick={() => castVote(p.id!)}
                disabled={me.status !== "alive" || p.status !== "alive" || me.votedFor !== undefined && me.votedFor !== ""}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all
                  ${!p.votedFor ? '' : 'pl-2'}
                  ${p.status !== 'alive' ? 'bg-red-500/10 border-red-500/30 opacity-50 cursor-not-allowed' : 
                   me.votedFor === p.id ? 'bg-blue-500/20 border-blue-500 text-blue-100' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-500 cursor-pointer'}
                `}
              >
                <div>
                  <span className={`font-bold ${p.status !== 'alive' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                    {p.name}
                  </span>
                  {p.status !== 'alive' && <span className="text-xs text-red-500 ml-2 font-bold tracking-widest uppercase">{p.status}</span>}
                </div>
                {players.filter(vp => vp.votedFor === p.id).length > 0 && (
                  <span className="bg-zinc-700 px-2.5 py-1 rounded-full text-xs font-bold text-zinc-100">
                    {players.filter(vp => vp.votedFor === p.id).length}
                  </span>
                )}
              </button>
            ))}
            <button 
              onClick={() => castVote('skip')}
              disabled={me.status !== "alive" || (me.votedFor !== undefined && me.votedFor !== "")}
              className={`flex items-center justify-between p-4 rounded-xl border text-left mt-4 transition-all
                ${me.votedFor === 'skip' ? 'bg-zinc-700 border-zinc-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 cursor-pointer'}
              `}
            >
              <span className="font-bold text-zinc-400">SKIP VOTE</span>
              {players.filter(vp => vp.votedFor === 'skip').length > 0 && (
                <span className="bg-zinc-800 px-2.5 py-1 rounded-full text-xs font-bold text-zinc-100">
                  {players.filter(vp => vp.votedFor === 'skip').length}
                </span>
              )}
            </button>
         </div>
      </div>
      
      {game.ownerId === user.uid && (
        <button onClick={endMeeting} className="mt-4 px-8 py-4 bg-red-500 hover:bg-red-600 font-bold rounded-full shadow-lg w-full max-w-md relative z-10 cursor-pointer uppercase tracking-widest transition-colors mb-8">
          END VOTING
        </button>
      )}
    </div>
  );
}
