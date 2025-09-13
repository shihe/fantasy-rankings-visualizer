// Fix: Removed self-import of 'Player' which caused a naming conflict.

export interface Player {
  rank: number;
  name: string;
  position: string;
  positionalRank?: number;
  team?: string;
}

export interface FantasyTeam {
  name: string;
  players: string[];
  color: string;
}