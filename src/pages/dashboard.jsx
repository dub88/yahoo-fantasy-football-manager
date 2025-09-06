import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, logout } from '../utils/auth';
import { fetchUserTeams, fetchLeagueStandings } from '../utils/yahooApi';
import AuthButton from '../components/AuthButton';
import RosterDisplay from '../components/RosterDisplay';
import LineupOptimizer from '../components/LineupOptimizer';
import TradeAnalyzer from '../components/TradeAnalyzer';
import WaiverAssistant from '../components/WaiverAssistant';
import PerformanceChart from '../components/PerformanceChart';
import PlayerRankings from '../components/PlayerRankings';
import MatchupAnalysis from '../components/MatchupAnalysis';
import LeagueStandings from '../components/LeagueStandings';
import PlayerNews from '../components/PlayerNews';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [teamKey, setTeamKey] = useState('');
  const [leagueKey, setLeagueKey] = useState('');
  const [opponentKey, setOpponentKey] = useState('');
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/');
    } else {
      // Fetch user's teams automatically
      fetchUserTeamsData();
    }
  }, [navigate]);

  // Helper function for league key validation
  const isValidLeagueKey = (key) => {
    const leagueKeyRegex = /^\d+\.l\.\d+$/; // Matches 'game_id.l.league_id'
    return key && leagueKeyRegex.test(key);
  };

  const fetchUserTeamsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserTeams();
      console.log('Raw user teams data:', data);
      
      // Handle XML response from Yahoo API
      if (typeof data === 'string' && data.includes('<?xml')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        // Log XML for debugging
        console.log('XML Document structure:', xmlDoc);
        
        // Try different approaches to find teams in the XML
        let teamsArray = [];
        let leaguesArray = [];
        
        // Approach 1: Look for teams directly
        const directTeams = xmlDoc.getElementsByTagName('team');
        console.log('Direct teams found:', directTeams.length);
        
        // Approach 2: Look for teams within fantasy_content > users > user > games > game > teams
        const fantasyContent = xmlDoc.getElementsByTagName('fantasy_content')[0];
        if (fantasyContent) {
          // Try to find games
          const games = fantasyContent.getElementsByTagName('game');
          console.log('Games found:', games.length);
          
          for (let g = 0; g < games.length; g++) {
            const game = games[g];
            const gameKey = game.getElementsByTagName('game_key')[0]?.textContent;
            const gameName = game.getElementsByTagName('name')[0]?.textContent;
            console.log(`Game ${g}:`, { gameKey, gameName });
            
            // Look for teams within game
            const teams = game.getElementsByTagName('team');
            console.log(`Teams in game ${g}:`, teams.length);
            
            // Look for leagues within game
            const leagues = game.getElementsByTagName('league');
            console.log(`Leagues in game ${g}:`, leagues.length);
            
            // Process leagues and their teams
            for (let l = 0; l < leagues.length; l++) {
              const league = leagues[l];
              const leagueKey = league.getElementsByTagName('league_key')[0]?.textContent || '';
              const leagueName = league.getElementsByTagName('name')[0]?.textContent || 'Unknown League';
              const season = league.getElementsByTagName('season')[0]?.textContent || '';
              const isFinished = league.getElementsByTagName('is_finished')[0]?.textContent === '1';
              
              console.log(`League ${l} in game ${g}:`, { leagueKey, leagueName, season });
              
              // Only process valid league keys
              if (isValidLeagueKey(leagueKey)) {
                leaguesArray.push({ 
                  league_key: leagueKey, 
                  name: leagueName, 
                  season: season,
                  is_finished: isFinished,
                  game_key: gameKey
                });
                
                // Find teams in this league
                const leagueTeams = league.getElementsByTagName('team');
                console.log(`Teams in league ${l}, game ${g}:`, leagueTeams.length);
                
                for (let t = 0; t < leagueTeams.length; t++) {
                  const team = leagueTeams[t];
                  const teamKey = team.getElementsByTagName('team_key')[0]?.textContent || '';
                  const teamName = team.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
                  
                  if (teamKey) {
                    teamsArray.push({
                      team_key: teamKey,
                      name: teamName,
                      league_key: leagueKey,
                      league_name: leagueName,
                      season: season,
                      is_finished: isFinished,
                      game_key: gameKey
                    });
                    console.log(`Added team ${teamName} with league ${leagueName}`);
                  }
                }
              } else {
                console.log(`Skipping invalid league key: ${leagueKey}`);
              }
            }
          }
        }
        
        // If no teams found yet, try another approach
        if (teamsArray.length === 0) {
          // Try to find users and navigate through the structure
          const users = xmlDoc.getElementsByTagName('user');
          console.log('Users found:', users.length);
          
          for (let u = 0; u < users.length; u++) {
            const user = users[u];
            const userGames = user.getElementsByTagName('game');
            
            for (let g = 0; g < userGames.length; g++) {
              const game = userGames[g];
              const gameKey = game.getElementsByTagName('game_key')[0]?.textContent;
              
              // Look for teams in this game
              const gameTeams = game.getElementsByTagName('team');
              console.log(`Teams in user ${u}, game ${g}:`, gameTeams.length);
              
              for (let t = 0; t < gameTeams.length; t++) {
                const team = gameTeams[t];
                const teamKey = team.getElementsByTagName('team_key')[0]?.textContent || '';
                const teamName = team.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
                
                // Try to find league info for this team
                const teamLeague = team.getElementsByTagName('league')[0];
                let leagueKey = '';
                let leagueName = 'Unknown League';
                let season = '';
                
                if (teamLeague) {
                  leagueKey = teamLeague.getElementsByTagName('league_key')[0]?.textContent || '';
                  leagueName = teamLeague.getElementsByTagName('name')[0]?.textContent || 'Unknown League';
                  season = teamLeague.getElementsByTagName('season')[0]?.textContent || '';
                }
                
                // Only add team if it has a valid league key
                if (teamKey && isValidLeagueKey(leagueKey)) {
                  teamsArray.push({
                    team_key: teamKey,
                    name: teamName,
                    league_key: leagueKey,
                    league_name: leagueName,
                    season: season,
                    game_key: gameKey
                  });
                  
                  // Add league if not already added
                  if (!leaguesArray.some(l => l.league_key === leagueKey)) {
                    leaguesArray.push({
                      league_key: leagueKey,
                      name: leagueName,
                      season: season,
                      game_key: gameKey
                    });
                  }
                  
                  console.log(`Added team ${teamName} with league ${leagueName} from user approach`);
                }
              }
            }
          }
        }
        
        console.log('Final teams array:', teamsArray);
        console.log('Final leagues array:', leaguesArray);
        
        // Set teams and leagues with valid data
        setTeams(teamsArray);
        setLeagues(leaguesArray);
        
        // Auto-select a team if available and valid
        if (teamsArray.length > 0) {
          // Sort teams by season (descending) to get most recent first
          teamsArray.sort((a, b) => {
            const seasonA = parseInt(a.season) || 0;
            const seasonB = parseInt(b.season) || 0;
            return seasonB - seasonA;
          });
          
          const firstTeam = teamsArray[0]; // Select the first valid team (most recent season)
          console.log('Selected team:', firstTeam);
          
          if (firstTeam.team_key && firstTeam.league_key && isValidLeagueKey(firstTeam.league_key)) {
            setTeamKey(firstTeam.team_key);
            setLeagueKey(firstTeam.league_key);
            fetchOpponents(firstTeam.league_key, firstTeam.team_key);
          } else {
            setError(`Team has invalid league key: ${firstTeam.league_key}. Cannot fetch opponents.`);
          }
        } else {
          setError('No valid teams found. Please check your API access or data.');
        }
      }
    } catch (err) {
      setError('Failed to fetch user teams. Please try again.');
      console.error('Error fetching user teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (e) => {
    const selectedTeamKey = e.target.value;
    setTeamKey(selectedTeamKey);
    
    const selectedTeam = teams.find(team => team.team_key === selectedTeamKey);
    if (selectedTeam && selectedTeam.league_key && isValidLeagueKey(selectedTeam.league_key)) {
      setLeagueKey(selectedTeam.league_key);
      fetchOpponents(selectedTeam.league_key, selectedTeamKey);
    } else {
      setLeagueKey('');
      setOpponents([]);
      setError('Selected team has an invalid or missing league key. Please select a valid team or refresh.');
    }
  };

  const fetchOpponents = async (selectedLeagueKey, currentTeamKey) => {
    if (!isValidLeagueKey(selectedLeagueKey)) {
      console.error('Invalid league key for fetching opponents:', selectedLeagueKey);
      setError('Invalid league key. Cannot fetch opponents. Please ensure a valid league is selected.');
      return;
    }
    try {
      const data = await fetchLeagueStandings(selectedLeagueKey);
      if (typeof data === 'string' && data.includes('<?xml')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        const teamNodes = xmlDoc.getElementsByTagName('team');
        const opponentsArray = [];
        for (let i = 0; i < teamNodes.length; i++) {
          const teamNode = teamNodes[i];
          const teamKey = teamNode.getElementsByTagName('team_key')[0]?.textContent || '';
          const teamName = teamNode.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
          if (teamKey !== currentTeamKey) {
            opponentsArray.push({ team_key: teamKey, name: teamName });
          }
        }
        setOpponents(opponentsArray);
      }
    } catch (err) {
      console.error('Error fetching opponents:', err);
      setError('Failed to fetch opponents. Check API status or league key.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'roster':
        return <RosterDisplay teamKey={teamKey} />;
      case 'rankings':
        return <PlayerRankings leagueKey={leagueKey} />;
      case 'matchup':
        return <MatchupAnalysis teamKey={teamKey} opponentKey={opponentKey} />;
      case 'standings':
        return <LeagueStandings leagueKey={leagueKey} />;
      case 'news':
        return <PlayerNews />;
      case 'lineup':
        return <LineupOptimizer />;
      case 'trades':
        return <TradeAnalyzer />;
      case 'waivers':
        return <WaiverAssistant />;
      case 'performance':
        return <PerformanceChart />;
      default:
        return <RosterDisplay teamKey={teamKey} />;
    }
  };

  if (!isAuthenticated()) {
    return null; // This will be handled by the useEffect redirect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Fantasy Football Manager</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Welcome back!</div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Team/League Selection */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Teams & Leagues</h2>
          
          {loading ? (
            <div className="text-center py-4">Loading your teams...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="teamSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Your Team
                </label>
                <select
                  id="teamSelect"
                  value={teamKey}
                  onChange={handleTeamChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.team_key} value={team.team_key}>
                      {team.name} ({team.league_name || 'Unknown League'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="leagueSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  League
                </label>
                <select
                  id="leagueSelect"
                  value={leagueKey}
                  onChange={(e) => {
                    const newLeagueKey = e.target.value;
                    setLeagueKey(newLeagueKey);
                    // Fetch opponents only if a team is selected and the new league key is valid
                    if (teamKey && isValidLeagueKey(newLeagueKey)) {
                      fetchOpponents(newLeagueKey, teamKey);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a league</option>
                  {leagues.map((league) => (
                    <option key={league.league_key} value={league.league_key}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="opponentSelect" className="block text-sm font-medium text-gray-700 mb-1">
                  Opponent (for matchup analysis)
                </label>
                <select
                  id="opponentSelect"
                  value={opponentKey}
                  onChange={(e) => setOpponentKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an opponent</option>
                  {opponents.map((opponent) => (
                    <option key={opponent.team_key} value={opponent.team_key}>
                      {opponent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchUserTeamsData}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Refresh Teams
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'roster', name: 'Roster' },
              { id: 'rankings', name: 'Player Rankings' },
              { id: 'matchup', name: 'Matchup Analysis' },
              { id: 'standings', name: 'League Standings' },
              { id: 'news', name: 'Player News' },
              { id: 'lineup', name: 'Lineup Optimizer' },
              { id: 'trades', name: 'Trade Analyzer' },
              { id: 'waivers', name: 'Waiver Assistant' },
              { id: 'performance', name: 'Performance' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
