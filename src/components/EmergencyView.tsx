import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../types";
import { AlertTriangle } from "lucide-react";

export function EmergencyView({ user }: { user: any }) {
  const { gameId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const triggerMeeting = async () => {
      if (!gameId || !user) return;
      try {
        const pRef = doc(db, `games/${gameId}/players`, user.uid);
        const pSnap = await getDoc(pRef);
        if (!pSnap.exists() || pSnap.data()?.status !== "alive") {
          navigate(`/game/${gameId}`);
          return;
        }

        await updateDoc(doc(db, "games", gameId), {
          status: "meeting",
          updatedAt: Date.now()
        });
        
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `games/${gameId}`);
      }
    };
    
    triggerMeeting();
  }, [gameId, user, navigate]);

  return (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="text-red-500 mb-6 animate-[pulse_1s_ease-in-out_infinite] scale-150">
         <AlertTriangle size={64}/>
      </div>
      <h1 className="text-3xl font-bold text-red-500 uppercase tracking-widest mb-4">TRIGGERING EMERGENCY</h1>
      <p className="text-red-200">Broadcast sent.</p>
    </div>
  );
}
