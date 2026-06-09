import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export function ScanRouter() {
  const { tagId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const gameId = localStorage.getItem("currentGameId");
    if (!gameId) {
      toast.error("You are not currently active in any deployment.");
      navigate("/");
      return;
    }

    if (!tagId) {
       navigate("/");
       return;
    }

    if (tagId === "EMERGENCY") {
       navigate(`/game/${gameId}/emergency`);
       return;
    }

    if (tagId.startsWith("M")) {
      navigate(`/game/${gameId}/mission/${tagId}`);
    } else {
      // It's a player ID
      navigate(`/game/${gameId}/kill/${tagId}`);
    }
  }, [tagId, navigate]);

  return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-50 font-sans">Resolving Signal...</div>;
}
