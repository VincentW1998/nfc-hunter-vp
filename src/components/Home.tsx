import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType, Game, Player } from "../types";
import { toast } from "react-hot-toast";

export function Home({ user }: { user: any }) {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tag = searchParams.get("tag");
    if (tag) {
      toast.error("You must join a game before scanning tags.", { id: 'tag_warn' });
    }
  }, [searchParams]);

  const joinGame = async (e: any) => {
    e.preventDefault();
    if (!code) return;
    const gameId = code.toUpperCase();
    
    try {
      const snap = await getDoc(doc(db, "games", gameId));
      if (!snap.exists()) {
        toast.error("Deployment code not found.");
        return;
      }
      navigate(`/lobby/${gameId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `games/${gameId}`);
    }
  };

  const createGame = async () => {
    const gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
    try {
      const batch = writeBatch(db);

      const newGame: Game = {
        status: "lobby",
        ownerId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const adminPlayer: Player = {
        name: user.displayName || user.email?.split('@')[0] || "Admin",
        role: "unassigned",
        status: "alive",
        joinTime: Date.now()
      };

      batch.set(doc(db, "games", gameId), newGame);
      batch.set(doc(db, `games/${gameId}/players`, user.uid), adminPlayer);

      await batch.commit();

      navigate(`/admin/${gameId}`);
    } catch (err) {
       handleFirestoreError(err, OperationType.CREATE, `games/${gameId}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-50 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-30 pointer-events-none"></div>
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[16px] p-8 shadow-2xl relative z-10">
        <h1 className="text-3xl font-bold mb-2 text-center text-zinc-50 tracking-tight">NFC HUNTER</h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">Welcome, {user.displayName || "Operative"}</p>
        
        <form onSubmit={joinGame} className="flex flex-col gap-4 mb-8">
          <input 
            type="text" 
            placeholder="ENTER 4-LETTERS CODE" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-full bg-zinc-950 border border-blue-500 py-3 px-4 rounded-xl font-bold text-center tracking-widest text-xl uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-full font-bold uppercase tracking-widest text-white transition-colors cursor-pointer">
            JOIN DEPLOYMENT
          </button>
        </form>

        <div className="border-t border-zinc-800 pt-8 mt-4 text-center">
          <p className="text-zinc-400 mb-4 text-[10px] uppercase font-bold tracking-widest bg-yellow-400 text-black px-2 py-1 inline-block rounded">AUTHORIZED PERSONNEL ONLY</p><br/>
          <button onClick={createGame} className="text-zinc-400 hover:text-blue-500 font-bold transition-colors text-sm uppercase tracking-wider cursor-pointer">
            Initialize New Deployment
          </button>
        </div>
      </div>
    </div>
  );
}
