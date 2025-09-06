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
        
        // Initialize arrays for teams and leagues
        let teamsArray = [];
        let leaguesArray = [];
        
        // Get the fantasy_content root element
        const fantasyContent = xmlDoc.getElementsByTagName('fantasy_content')[0];
        if (!fantasyContent) {
          throw new Error('Invalid XML structure: fantasy_content element not found');
        }
        
        // Get the users element
        const users = fantasyContent.getElementsByTagName('users')[0];
        if (!users) {
          throw new Error('Invalid XML structure: users element not found');
        }
        
        // Get the user element
        const user = users.getElementsByTagName('user')[0];
        if (!user) {
          throw new Error('Invalid XML structure: user element not found');
        }
        
        // Get the games element
        const games = user.getElementsByTagName('games')[0];
        if (!games) {
          throw new Error('Invalid XML structure: games element not found');
        }
        
        // Process each game
        const gameElements = games.getElementsByTagName('game');
        console.log(`Found ${gameElements.length} games`);
        
        for (let g = 0; g < gameElements.length; g++) {
          const game = gameElements[g];
          const gameKey = game.getElementsByTagName('game_key')[0]?.textContent;
          const gameName = game.getElementsByTagName('name')[0]?.textContent;
          const gameCode = game.getElementsByTagName('code')[0]?.textContent;
          const gameSeason = game.getElementsByTagName('season')[0]?.textContent;
          
          console.log(`Game ${g}:`, { gameKey, gameName, gameCode, gameSeason });
          
          // Only process football games
          if (gameCode === 'nfl') {
            console.log(`Found NFL game: ${gameName} (${gameSeason})`);
            
            // Get the leagues element
            const leagues = game.getElementsByTagName('leagues')[0];
            if (leagues) {
              const leagueElements = leagues.getElementsByTagName('league');
              console.log(`Found ${leagueElements.length} leagues in game ${gameKey}`);
              
              // Process each league
              for (let l = 0; l < leagueElements.length; l++) {
                const league = leagueElements[l];
                const leagueKey = league.getElementsByTagName('league_key')[0]?.textContent || '';
                const leagueName = league.getElementsByTagName('name')[0]?.textContent || 'Unknown League';
                const leagueSeason = league.getElementsByTagName('season')[0]?.textContent || '';
                const isFinished = league.getElementsByTagName('is_finished')[0]?.textContent === '1';
                
                console.log(`League ${l}:`, { leagueKey, leagueName, leagueSeason, isFinished });
                
                // Only process leagues with valid keys
                if (isValidLeagueKey(leagueKey)) {
                  // Add league to leagues array
                  leaguesArray.push({
                    league_key: leagueKey,
                    name: leagueName,
                    season: leagueSeason,
                    is_finished: isFinished,
                    game_key: gameKey
                  });
                  
                  // Get the teams element
                  const teams = league.getElementsByTagName('teams')[0];
                  if (teams) {
                    const teamElements = teams.getElementsByTagName('team');
                    console.log(`Found ${teamElements.length} teams in league ${leagueKey}`);
                    
                    // Process each team
                    for (let t = 0; t < teamElements.length; t++) {
                      const team = teamElements[t];
                      const teamKey = team.getElementsByTagName('team_key')[0]?.textContent || '';
                      const teamName = team.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
                      const teamUrl = team.getElementsByTagName('url')[0]?.textContent || '';
                      
                      console.log(`Team ${t}:`, { teamKey, teamName, teamUrl });
                      
                      // Add team to teams array
                      if (teamKey) {
                        teamsArray.push({
                          team_key: teamKey,
                          name: teamName,
                          url: teamUrl,
                          league_key: leagueKey,
                          league_name: leagueName,
                          season: leagueSeason,
                          is_finished: isFinished,
                          game_key: gameKey
                        });
                        console.log(`Added team ${teamName} with league ${leagueName}`);
                      }
                    }
                  } else {
                    console.log(`No teams element found in league ${leagueKey}`);
                  }
                } else {
                  console.log(`Skipping invalid league key: ${leagueKey}`);
                }
              }
            } else {
              console.log(`No leagues element found in game ${gameKey}`);
            }
          } else {
            console.log(`Skipping non-NFL game: ${gameName} (${gameCode})`);
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
    <div className="min-h-screen bg-yahoo-gray">
      {/* Yahoo Header */}
      <header className="yahoo-header">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1>Yahoo Fantasy Football</h1>
          <div className="flex items-center space-x-4 user-menu">
            <div>Welcome back!</div>
            <button
              onClick={handleLogout}
              className="text-white hover:text-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Yahoo Navigation */}
      <div className="yahoo-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto">
          {[
            { id: 'roster', name: 'Roster' },
            { id: 'rankings', name: 'Players' },
            { id: 'matchup', name: 'Matchup' },
            { id: 'standings', name: 'Standings' },
            { id: 'news', name: 'News' },
            { id: 'lineup', name: 'Lineup' },
            { id: 'trades', name: 'Trade' },
            { id: 'waivers', name: 'Waiver' },
            { id: 'performance', name: 'Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'active' : ''}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Team/League Selection */}
        <div className="yahoo-content mb-6">
          <h2>Your Teams & Leagues</h2>
          
          {loading ? (
            <div className="text-center py-4">Loading your teams...</div>
          ) : error ? (
            <div className="yahoo-alert error">{error}</div>
          ) : (
            <div className="yahoo-grid">
              <div className="col-span-4">
                <label htmlFor="teamSelect" className="yahoo-label">
                  Select Your Team
                </label>
                <select
                  id="teamSelect"
                  value={teamKey}
                  onChange={handleTeamChange}
                  className="yahoo-select"
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team.team_key} value={team.team_key}>
                      {team.name} ({team.league_name || 'Unknown League'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-4">
                <label htmlFor="leagueSelect" className="yahoo-label">
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
                  className="yahoo-select"
                >
                  <option value="">Select a league</option>
                  {leagues.map((league) => (
                    <option key={league.league_key} value={league.league_key}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-4">
                <label htmlFor="opponentSelect" className="yahoo-label">
                  Opponent (for matchup analysis)
                </label>
                <select
                  id="opponentSelect"
                  value={opponentKey}
                  onChange={(e) => setOpponentKey(e.target.value)}
                  className="yahoo-select"
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
              className="yahoo-button"
            >
              Refresh Teams
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="yahoo-content">
          {renderActiveTab()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
