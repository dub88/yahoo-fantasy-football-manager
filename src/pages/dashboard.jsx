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
        console.log('XML Document:', xmlDoc);
        
        // Extract users, games, leagues, and teams
        const usersNodes = xmlDoc.getElementsByTagName('user');
        const teamsArray = [];
        const leaguesArray = [];
        
        for (let u = 0; u < usersNodes.length; u++) {
          const userNode = usersNodes[u];
          const gamesNodes = userNode.getElementsByTagName('game');
          for (let g = 0; g < gamesNodes.length; g++) {
            const gameNode = gamesNodes[g];
            const leaguesNodes = gameNode.getElementsByTagName('league');
            for (let l = 0; l < leaguesNodes.length; l++) {
              const leagueNode = leaguesNodes[l];
              const leagueKey = leagueNode.getElementsByTagName('league_key')[0]?.textContent || '';
              const leagueName = leagueNode.getElementsByTagName('name')[0]?.textContent || 'Unknown League';
              const season = leagueNode.getElementsByTagName('season')[0]?.textContent || '';
              const isFinished = leagueNode.getElementsByTagName('is_finished')[0]?.textContent === '1';
              
              // Validate league key before adding
              if (isValidLeagueKey(leagueKey)) {
                leaguesArray.push({ league_key: leagueKey, name: leagueName, season: season, is_finished: isFinished });
              } else {
                console.log('Invalid league key found:', leagueKey, ' - Skipping this league');
              }
              
              // Extract teams from this league only if league key is valid
              if (isValidLeagueKey(leagueKey)) {
                const teamsNodes = leagueNode.getElementsByTagName('team');
                for (let t = 0; t < teamsNodes.length; t++) {
                  const teamNode = teamsNodes[t];
                  const teamKey = teamNode.getElementsByTagName('team_key')[0]?.textContent || '';
                  const teamName = teamNode.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
                  
                  // Only add teams with valid keys
                  if (teamKey) {
                    teamsArray.push({
                      team_key: teamKey,
                      name: teamName,
                      league_key: leagueKey,
                      league_name: leagueName,
                      season: season,
                      is_finished: isFinished
                    });
                  }
                }
              } else {
                console.log('Skipping team extraction for invalid league key:', leagueKey);
              }
            }
          }
        }
        
        // Set teams and leagues with valid data
        setTeams(teamsArray);
        setLeagues(leaguesArray);
        
        // Auto-select a team if available and valid
        if (teamsArray.length > 0) {
          const firstTeam = teamsArray[0]; // Select the first valid team
          setTeamKey(firstTeam.team_key);
          setLeagueKey(firstTeam.league_key);
          if (isValidLeagueKey(firstTeam.league_key)) {
            fetchOpponents(firstTeam.league_key, firstTeam.team_key);
          } else {
            setError('First team has an invalid league key. Cannot fetch opponents.');
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
                    setLeagueKey(e.target.value);
                    // Fetch opponents when league is manually changed
                    if (teamKey) {
                      fetchOpponents(e.target.value, teamKey);
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
