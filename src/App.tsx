/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navigate } from "react-router-dom";
import { HashRouter as Router, Routes, Route, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { Toaster, toast } from "react-hot-toast";

import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { GameDash } from "./components/GameDash";
import { AdminPanel } from "./components/AdminPanel";
import { MissionView } from "./components/MissionView";
import { VotingView } from "./components/VotingView";
import { KillView } from "./components/KillView";
import { Player, Game } from "./types";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAnonymousLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      toast.error("Please enter an operative name.");
      return;
    }
    setAuthenticating(true);
    try {
      const userCred = await signInAnonymously(auth);
      await updateProfile(userCred.user, { displayName: nickname.trim().toUpperCase() });
      setUser({ ...userCred.user, displayName: nickname.trim().toUpperCase() });
      toast.success("Identity established.");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to connect identity.");
      setAuthenticating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-50 font-sans">Loading Core...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-50 font-sans p-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_#27272a_1px,_transparent_0)] bg-[length:24px_24px] opacity-50"></div>
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-8 tracking-tighter">NFC HUNTER</h1>
          <p className="text-zinc-400 mb-8 max-w-sm text-center text-sm">
            Enter your operative alias to connect securely to the network. No Google account required.
          </p>
          <form onSubmit={handleAnonymousLogin} className="w-full flex flex-col gap-4">
            <input 
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="OPERATIVE NAME"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 py-4 px-4 rounded-xl font-bold text-center tracking-widest uppercase outline-none transition-colors"
              disabled={authenticating}
            />
            <button 
              type="submit"
              disabled={authenticating || !nickname.trim()}
              className="w-full py-4 bg-blue-500 disabled:bg-blue-500/50 hover:bg-blue-600 rounded-full font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
            >
              {authenticating ? "CONNECTING..." : "CONNECT IDENTITY"}
            </button>
          </form>
          
          <div className="mt-8 flex items-center justify-center w-full relative">
            <div className="absolute w-full h-[1px] bg-zinc-800"></div>
            <span className="bg-zinc-950 px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest relative z-10">OR</span>
          </div>
          
          <button 
            type="button"
            onClick={() => { setAuthenticating(true); signInWithPopup(auth, new GoogleAuthProvider()).catch(() => setAuthenticating(false)); }}
            disabled={authenticating}
            className="w-full mt-8 py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full font-bold text-zinc-300 transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer text-sm"
          >
            SIGN IN WITH GOOGLE
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ style: { background: '#18181b', color: '#fafafa', border: '1px solid #27272a' } }} />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/lobby/:gameId" element={<Lobby user={user} />} />
        <Route path="/game/:gameId" element={<GameDash user={user} />} />
        <Route path="/admin/:gameId" element={<AdminPanel user={user} />} />
        <Route path="/game/:gameId/mission/:missionId" element={<MissionView user={user} />} />
        <Route path="/game/:gameId/kill/:targetId" element={<KillView user={user} />} />
        <Route path="/game/:gameId/vote" element={<VotingView user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
