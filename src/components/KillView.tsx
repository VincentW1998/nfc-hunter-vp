import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";

export function KillView({ user }: { user: any }) {
  const { gameId, targetId } = useParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    
    async function processKill() {
      if (!gameId || !targetId || !user) return;
      try {
        const meSnap = await getDoc(doc(db, `games/${gameId}/players`, user.uid));
        if (!meSnap.exists()) {
            navigate(`/`); return;
        }
        const me = meSnap.data();
        
        if (me.status !== 'alive') {
            toast.error("You are dead. You cannot do this.");
            navigate(`/game/${gameId}`);
            return;
        }

        if (targetId === user.uid) {
            toast.error("You cannot scan yourself.");
            navigate(`/game/${gameId}`);
            return;
        }

        const targetRef = doc(db, `games/${gameId}/players`, targetId);
        const targetSnap = await getDoc(targetRef);
        if (!targetSnap.exists()) {
            toast.error("Invalid target.");
            navigate(`/game/${gameId}`);
            return;
        }

        const target = targetSnap.data();
        
        // If target is dead, report the body!
        if (target.status === 'dead') {
            await updateDoc(doc(db, "games", gameId), {
              status: "meeting",
              updatedAt: Date.now()
            });
            toast.success("Dead body reported!");
            navigate(`/game/${gameId}`);
            return;
        }

        // Target is alive. But are we a killer?
        if (me.role !== 'killer') {
            toast.error("You are a crewmate. You cannot eliminate operatives.");
            navigate(`/game/${gameId}`);
            return;
        }

        // Cannot kill another killer
        if (target.role === 'killer') {
            toast.error("You cannot eliminate another killer.");
            navigate(`/game/${gameId}`);
            return;
        }

        const now = Date.now();
        if (me.lastKillTime && now - me.lastKillTime < 120000) {
            const left = Math.ceil((120000 - (now - me.lastKillTime)) / 1000);
            toast.error(`Weapon cooling down. ${left}s remaining.`);
            navigate(`/game/${gameId}`);
            return;
        }

        await updateDoc(targetRef, { status: "dead" });
        await updateDoc(doc(db, `games/${gameId}/players`, user.uid), { lastKillTime: now });
        toast.success("Elimination successful. Flee the scene.");
        navigate(`/game/${gameId}`);
      } catch (err) {
        console.error(err);
        navigate(`/game/${gameId}`);
      }
    }
    
    processed.current = true;
    processKill();
  }, [gameId, targetId, user, navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans">
       <div className="animate-pulse text-xl text-red-500 font-bold tracking-widest uppercase mb-4">Processing Elimination...</div>
       <p className="text-zinc-500 text-sm">Please hold steady near target.</p>
    </div>
  );
}
