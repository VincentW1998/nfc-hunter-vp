export type GameStatus = "lobby" | "playing" | "meeting" | "voting" | "finished";
export type PlayerRole = "crewmate" | "killer" | "unassigned";
export type PlayerStatus = "alive" | "dead" | "eliminated";
export type MissionType = "code" | "clicker" | "wires" | "simon" | "gauge" | "oxygen";
import { toast } from "react-hot-toast";

export interface Game {
  id?: string;
  status: GameStatus;
  winner?: "crewmates" | "killers" | null;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  votingStartTime?: number;
  lastEmergencyTime?: number;
  round?: number;
  completedMissions?: string[];
  killerCount?: number;
  killersKnowEachOther?: boolean;
}

export interface Player {
  id?: string;
  name: string;
  role: PlayerRole;
  status: PlayerStatus;
  joinTime: number;
  votedFor?: string | null;
  lastKillTime?: number;
  round?: number;
}

export interface Mission {
  id?: string;
  name: string;
  type: MissionType;
  description?: string;
  passcode?: string;
  clickTarget?: number;
  createdAt?: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  toast.error(`Error: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}
