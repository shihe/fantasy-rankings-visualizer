import { Player } from '../types';

// A list of base positions to check for.
const BASE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF'];

/**
 * Checks if a string part is a valid team abbreviation (2-4 uppercase letters).
 * @param part The string part to analyze.
 * @returns True if the part is a team abbreviation.
 */
function isTeam(part: string): boolean {
    if (!part) return false;
    // Simple regex for 2-4 uppercase letters, common for team abbreviations.
    return /^[A-Z]{2,3}$/.test(part);
}

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
 * Parses fantasy football rankings from a space-delimited text block.
 * This version supports multiple formats and extracts team and positional rank info.
 * @param text The raw string containing the rankings.
 * @returns A promise that resolves to an array of Player objects.
 */
export const parseRankingsFromText = async (text: string): Promise<Player[]> => {
  return new Promise((resolve, reject) => {
    try {
      const players: Player[] = [];
      const lines = text.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        const tabsReplaced = line.replace(/\t/g, ' ');
        const cleanLine = tabsReplaced.split(/ vs | @ /)[0];
        const parts = cleanLine.trim().split(/\s+/);

        if (parts.length < 2) continue;
        console.log(parts);
        const rankStr = parts[0].replace(/[.\)]$/, '');
        const rank = parseInt(rankStr, 10);
        if (isNaN(rank)) continue;

        const potentialNameParts = parts.slice(1);
        if (potentialNameParts.length === 0) continue;

        let positionInfo: { base: string; rank?: number } | null = null;
        let teamInfo: string | null = null;
        let nameEndIndex = potentialNameParts.length;

        const p1 = potentialNameParts[nameEndIndex - 1];
        const p2 = nameEndIndex > 1 ? potentialNameParts[nameEndIndex - 2] : null;

        const p1_pos = extractPositionAndRank(p1);
        const p1_team = isTeam(p1);
        const p2_pos = p2 ? extractPositionAndRank(p2) : null;
        const p2_team = p2 ? isTeam(p2) : null;

        if (p1_pos) { // Case: "... Team Pos" or "... Pos"
          positionInfo = p1_pos;
          if (p2_team) {
            teamInfo = p2!.toUpperCase();
            nameEndIndex -= 2;
          } else {
            nameEndIndex -= 1;
          }
        } else if (p1_team) { // Case: "... Pos Team"
          teamInfo = p1.toUpperCase();
          if (p2_pos) {
            positionInfo = p2_pos;
            nameEndIndex -= 2;
          }
        }

        if (positionInfo && nameEndIndex > 0) {
          const name = potentialNameParts.slice(0, nameEndIndex).join(' ');
          players.push({
            rank,
            name,
            position: positionInfo.base,
            positionalRank: positionInfo.rank,
            team: teamInfo ?? undefined,
          });
        }
      }
      resolve(players);
    } catch (error) {
      console.error("Error during local text parsing:", error);
      reject(new Error("Failed to parse rankings from text. Please check the format."));
    }
  });
};