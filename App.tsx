import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Player, FantasyTeam } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { parseRankingsFromText } from './services/geminiService';
import { TEAM_COLORS } from './constants';

// --- Helper Components & Icons (defined outside App to prevent re-renders) ---

const StarIcon: React.FC<{ isFilled: boolean; className?: string }> = ({ isFilled, className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={isFilled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${className} ${isFilled ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}`}
    aria-label={isFilled ? 'Favorited' : 'Not favorited'}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const LoaderIcon: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-gray-300 text-lg">Analyzing text and extracting rankings...</p>
  </div>
);

interface RankingsInputFormProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  hideUnselectedPlayers: boolean;
  onToggleHide: () => void;
  hasPlayers: boolean;
  text: string;
  onTextChange: (newText: string) => void;
}

const RankingsInputForm: React.FC<RankingsInputFormProps> = ({ onSubmit, isLoading, hideUnselectedPlayers, onToggleHide, hasPlayers, text, onTextChange }) => {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={`Paste your space-delimited rankings here...\nExample:\n1. Christian McCaffrey RB\n2. Breece Hall RB\n3. Josh Allen QB1`}
        className="flex-grow bg-gray-800 text-gray-200 border border-gray-600 rounded-md px-4 py-2 h-48 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y font-mono text-sm"
        disabled={isLoading}
        aria-label="Fantasy rankings input"
      />
      <div className="flex gap-2 self-end">
        <button
          type="button"
          onClick={onToggleHide}
          disabled={!hasPlayers}
          className="bg-gray-600 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {hideUnselectedPlayers ? 'Show All' : 'Hide Others'}
        </button>
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Visualizing...' : 'Visualize Rankings'}
        </button>
      </div>
    </form>
  );
};

interface TeamManagerProps {
  teams: FantasyTeam[];
  favoriteNames: string[];
  activeTeamNames: string[];
  setTeams: React.Dispatch<React.SetStateAction<FantasyTeam[]>>;
  setFavoriteNames: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTeamNames: React.Dispatch<React.SetStateAction<string[]>>;
}

const TeamManager: React.FC<TeamManagerProps> = ({ teams, favoriteNames, activeTeamNames, setTeams, setFavoriteNames, setActiveTeamNames }) => {
    const [newTeamName, setNewTeamName] = useState('');

    const handleCreateTeam = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newTeamName.trim();

        if (favoriteNames.length === 0) {
            alert("Please favorite players (using the star icon) to create a team.");
            return;
        }
        if (!trimmedName) {
            alert("Please enter a team name.");
            return;
        }
        if (teams.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert("A team with this name already exists.");
            return;
        }

        const newTeam: FantasyTeam = {
            name: trimmedName,
            players: [...favoriteNames].sort(),
            color: TEAM_COLORS[teams.length % TEAM_COLORS.length],
        };
        setTeams(prevTeams => [...prevTeams, newTeam]);
        setNewTeamName('');
        setFavoriteNames([]); // Clear favorites after creating a team
    };

    const handleDeleteTeam = useCallback((teamNameToDelete: string) => {
        setTeams(prevTeams => prevTeams.filter(team => team.name !== teamNameToDelete));
        setActiveTeamNames(prevActive => prevActive.filter(name => name !== teamNameToDelete));
    }, [setTeams, setActiveTeamNames]);

    const handleToggleTeam = useCallback((teamName: string) => {
        setActiveTeamNames(prevActive => {
            const newActive = new Set(prevActive);
            if (newActive.has(teamName)) {
                newActive.delete(teamName);
            } else {
                newActive.add(teamName);
            }
            return Array.from(newActive);
        });
    }, [setActiveTeamNames]);

    return (
        <div className="w-full bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col gap-4">
            <h3 className="text-xl font-bold text-gray-200">My Teams</h3>
             <form onSubmit={handleCreateTeam} className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="New Team Name"
                    className="flex-grow bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:bg-gray-800 disabled:cursor-not-allowed"
                    disabled={favoriteNames.length === 0}
                    aria-label="New team name"
                />
                <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    disabled={!newTeamName.trim() || favoriteNames.length === 0}
                    aria-label="Create new team from favorited players"
                >
                    Save Team
                </button>
            </form>
            <div className="flex flex-col gap-2">
                {teams.length === 0 && <p className="text-gray-400 text-sm text-center">No teams saved. Star players and enter a name above to create one.</p>}
                {teams.map(team => {
                    const isActive = activeTeamNames.includes(team.name);
                    return (
                        <div key={team.name} className="flex items-center justify-between gap-2 bg-gray-700 p-2 rounded-md">
                           <button 
                             onClick={() => handleToggleTeam(team.name)} 
                             className={`flex-grow text-left px-3 py-1 rounded-md transition-colors text-sm font-medium border-2 ${isActive ? 'text-white' : 'border-transparent text-gray-200 bg-gray-600 hover:bg-gray-500'}`}
                             style={{ backgroundColor: isActive ? team.color : undefined, borderColor: isActive ? team.color : undefined }}
                           >
                               {team.name} ({team.players.length})
                           </button>
                           <button onClick={() => handleDeleteTeam(team.name)} className="text-gray-400 hover:text-red-400 p-1 rounded-full" aria-label={`Delete team ${team.name}`}>
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                               </svg>
                           </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface PlayerTableProps {
  players: Player[];
  favorites: Set<string>;
  onToggleFavorite: (playerName: string) => void;
  playerHighlightColors: Record<string, string[]>;
}

const PlayerTable: React.FC<PlayerTableProps> = ({ players, favorites, onToggleFavorite, playerHighlightColors }) => (
    <div className="w-full overflow-x-auto rounded-lg shadow-xl">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800 sticky top-0">
          <tr>
            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-12">Fav</th>
            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-20">Pos Rank</th>
            <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-16">Ovr Rank</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Player</th>
          </tr>
        </thead>
        <tbody className="bg-gray-700 divide-y divide-gray-600">
          {players.map((player) => {
            const isFavorite = favorites.has(player.name);
            const highlightColors = playerHighlightColors[player.name] || [];
            
            let rowStyle: React.CSSProperties = {};
            if (highlightColors.length === 1) {
              rowStyle = { backgroundColor: `${highlightColors[0]}40` }; // Add alpha for transparency
            } else if (highlightColors.length > 1) {
              const gradient = `linear-gradient(to right, ${highlightColors.map(c => `${c}99`).join(', ')})`; // Add alpha
              rowStyle = { backgroundImage: gradient };
            }

            return (
              <tr 
                key={`${player.rank}-${player.name}`} 
                className={`transition-colors duration-200 ${isFavorite ? 'bg-yellow-900/40' : ''} hover:bg-gray-600/50`}
                style={rowStyle}
              >
                <td className="px-2 py-3 text-center bg-transparent">
                  <button onClick={() => onToggleFavorite(player.name)} className="cursor-pointer" aria-label={`Toggle favorite for ${player.name}`}>
                    <StarIcon isFilled={isFavorite} />
                  </button>
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm text-gray-300 bg-transparent">
                    {player.positionalRank ? player.positionalRank : player.position}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center text-sm font-medium text-gray-200 bg-transparent">{player.rank}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-100 bg-transparent">{player.name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
);

// --- Main App Component ---

const POSITIONS_TO_DISPLAY = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
const POSITION_FULL_NAMES: Record<string, string> = {
  QB: 'Quarterbacks',
  RB: 'Running Backs',
  WR: 'Wide Receivers',
  TE: 'Tight Ends',
  K: 'Kickers',
  DST: 'Defense/Special Teams'
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteNames, setFavoriteNames] = useLocalStorage<string[]>('fantasyFavorites', []);
  const [teams, setTeams] = useLocalStorage<FantasyTeam[]>('fantasyTeams', []);
  const [activeTeamNames, setActiveTeamNames] = useLocalStorage<string[]>('activeFantasyTeams', []);
  const [hideUnselectedPlayers, setHideUnselectedPlayers] = useState(false);
  const [rawText, setRawText] = useLocalStorage<string>('fantasyRankingsText', '');

  const favoritesSet = useMemo(() => new Set(favoriteNames), [favoriteNames]);

  const handleToggleFavorite = useCallback((playerName: string) => {
    setFavoriteNames(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(playerName)) {
        newFavorites.delete(playerName);
      } else {
        newFavorites.add(playerName);
      }
      return Array.from(newFavorites);
    });
  }, [setFavoriteNames]);
  
  const handleToggleHide = useCallback(() => {
    setHideUnselectedPlayers(prev => !prev);
  }, []);

  const handleSubmitRankings = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    setPlayers([]);
    try {
      const rankings = await parseRankingsFromText(text);
      setPlayers(rankings);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (rawText.trim()) {
      handleSubmitRankings(rawText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTeamPlayerNames = useMemo(() => {
    const playerSet = new Set<string>();
    const activeTeams = teams.filter(team => activeTeamNames.includes(team.name));
    for (const team of activeTeams) {
      for (const playerName of team.players) {
        playerSet.add(playerName);
      }
    }
    return playerSet;
  }, [teams, activeTeamNames]);

  const filteredPlayers = useMemo(() => {
    if (!hideUnselectedPlayers) {
      return players;
    }
    return players.filter(player =>
      favoritesSet.has(player.name) || activeTeamPlayerNames.has(player.name)
    );
  }, [players, hideUnselectedPlayers, favoritesSet, activeTeamPlayerNames]);


  const playersByPosition = useMemo(() => {
    const grouped: Record<string, Player[]> = {};
    POSITIONS_TO_DISPLAY.forEach(pos => {
      grouped[pos] = [];
    });

    const sortedByRank = [...filteredPlayers].sort((a, b) => a.rank - b.rank);

    for (const player of sortedByRank) {
      const upperPos = player.position.toUpperCase();
      if (grouped[upperPos]) {
        grouped[upperPos].push(player);
      }
    }
    return grouped;
  }, [filteredPlayers]);

  const playerHighlightColors = useMemo(() => {
    const colorMap: Record<string, string[]> = {};
    const activeTeams = teams.filter(team => activeTeamNames.includes(team.name));
    
    for (const team of activeTeams) {
      for (const playerName of team.players) {
        if (!colorMap[playerName]) {
          colorMap[playerName] = [];
        }
        colorMap[playerName].push(team.color);
      }
    }
    return colorMap;
  }, [teams, activeTeamNames]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-2xl mx-auto flex flex-col items-center space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Fantasy Rank Visualizer
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Paste rankings, favorite players, and build color-coded teams.
          </p>
        </header>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <RankingsInputForm 
                  onSubmit={handleSubmitRankings} 
                  isLoading={isLoading}
                  hideUnselectedPlayers={hideUnselectedPlayers}
                  onToggleHide={handleToggleHide}
                  hasPlayers={players.length > 0}
                  text={rawText}
                  onTextChange={setRawText}
                />
            </div>
            <TeamManager 
                teams={teams}
                favoriteNames={favoriteNames}
                activeTeamNames={activeTeamNames}
                setTeams={setTeams}
                setFavoriteNames={setFavoriteNames}
                setActiveTeamNames={setActiveTeamNames}
            />
        </div>
        
        {error && <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md w-full max-w-6xl text-center">{error}</div>}

        {isLoading ? (
          <LoaderIcon />
        ) : players.length > 0 ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {POSITIONS_TO_DISPLAY.map(pos => {
              const positionPlayers = playersByPosition[pos];
              if (!positionPlayers || positionPlayers.length === 0) {
                return null;
              }
              return (
                <div key={pos} className="w-full flex flex-col space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-cyan-300 text-center">
                    {POSITION_FULL_NAMES[pos]}
                  </h2>
                  <PlayerTable 
                    players={positionPlayers} 
                    favorites={favoritesSet} 
                    onToggleFavorite={handleToggleFavorite}
                    playerHighlightColors={playerHighlightColors}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          !error && (
            <div className="text-center bg-gray-800/50 p-8 rounded-lg border border-dashed border-gray-700 w-full max-w-6xl">
              <h2 className="text-2xl font-semibold text-gray-300">Welcome!</h2>
              <p className="mt-2 text-gray-400">
                Paste your rankings table into the text area above to get started. Your favorited players and saved teams will be here for your next visit.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
