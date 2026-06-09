export type GameStatus = "lobby" | "playing" | "voting" | "finished";
export type PlayerRole = "crewmate" | "killer" | "unassigned";
export type PlayerStatus = "alive" | "dead" | "eliminated";
export type MissionType = "code" | "clicker";
import { toast } from "react-hot-toast";

export interface Game {
  id?: string;
  status: GameStatus;
  winner?: "crewmates" | "killers" | null;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerTask {
  missionId: string;
  completed: boolean;
}

export interface Player {
  id?: string;
  name: string;
  role: PlayerRole;
  status: PlayerStatus;
  joinTime: number;
  tasks?: PlayerTask[];
  votedFor?: string | null;
}

export interface Mission {
  id?: string;
  name: string;
  type: MissionType;
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
