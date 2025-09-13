import { Player } from '../types';

// A list of base positions to check for.
const BASE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'];

/**
 * Extracts a base position and rank from a string part (e.g., "QB1" -> {base: "QB", rank: 1}).
 * @param part The string part to analyze.
 * @returns An object with the base position and rank, or null if not a valid position.
 */
function extractPositionAndRank(part: string): { base: string; rank?: number } | null {
  if (!part) return null;
  const upperPart = part.toUpperCase();

  for (const pos of BASE_POSITIONS) {
    if (upperPart.startsWith(pos)) {
      const rest = upperPart.substring(pos.length);
      if (/^\d*$/.test(rest)) { // Checks if the rest is empty or numeric
        const rank = parseInt(rest, 10);
        return {
          base: pos === 'DEF' ? 'DST' : pos, // Normalize DEF to DST
          rank: !isNaN(rank) ? rank : undefined,
        };
      }
    }
  }
  return null;
}

/**
 * Parses fantasy football rankings from a space-delimited text block without using an AI API.
 * This version supports multiple formats and extracts positional rank info, but ignores team info.
 * @param text The raw string containing the rankings.
 * @returns A promise that resolves to an array of Player objects.
 */
export const parseRankingsFromText = async (text: string): Promise<Player[]> => {
  return new Promise((resolve, reject) => {
    try {
      const players: Player[] = [];
      const lines = text.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        // 1. Pre-process line: remove matchup info (e.g., "vs DEN", "@ KC")
        const cleanLine = line.split(/ vs | @ /)[0];
        const parts = cleanLine.trim().split(/\s+/);
        
        if (parts.length < 2) continue; // Must have at least rank and name/pos

        const rankStr = parts[0].replace(/[.\)]$/, '');
        const rank = parseInt(rankStr, 10);
        if (isNaN(rank)) continue;

        const potentialNameParts = parts.slice(1);
        let positionInfo: { base: string; rank?: number } | null = null;
        let positionPartIndex = -1;

        // Find position from the right-most part of the line
        for (let i = potentialNameParts.length - 1; i >= 0; i--) {
            const part = potentialNameParts[i];
            const pos = extractPositionAndRank(part);
            if (pos) {
                positionInfo = pos;
                positionPartIndex = i;
                break; // Found the position, stop searching
            }
        }

        if (positionInfo) {
            // All parts up to the position are the player's name
            const finalNameParts = potentialNameParts.slice(0, positionPartIndex);
            const name = finalNameParts.join(' ');

            if (name) {
                players.push({
                    rank,
                    name,
                    position: positionInfo.base,
                    positionalRank: positionInfo.rank,
                });
            }
        }
      }
      resolve(players);
    } catch (error) {
      console.error("Error during local text parsing:", error);
      reject(new Error("Failed to parse rankings from text. Please check the format."));
    }
  });
};