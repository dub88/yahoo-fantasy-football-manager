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

  const fetchUserTeamsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserTeams();
      console.log('Raw user teams data:', data);
      
      // Handle XML response from Yahoo API
      if (typeof data === 'string' && data.includes('<?xml')) {
        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        // Log the XML structure for debugging
        console.log('XML Document:', xmlDoc);
        
        // Extract teams from XML
        const teamsNodes = xmlDoc.getElementsByTagName('team');
        const teamsArray = [];
        const leaguesMap = new Map(); // Use Map to store leagues by season
        
        // Get current date for determining current season
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
        
        // Determine current fantasy football season
        // Fantasy football seasons typically run from August/September to January/February
        // If it's before August, we're likely in the off-season of the previous year
        const currentFantasySeason = currentMonth < 8 ? currentYear - 1 : currentYear;
        
        console.log('Current date:', { currentYear, currentMonth, currentFantasySeason });
        
        console.log('Found', teamsNodes.length, 'teams in XML');
        
        for (let i = 0; i < teamsNodes.length; i++) {
          const teamNode = teamsNodes[i];
          
          // Log the team node for debugging
          console.log('Team node', i, ':', teamNode);
          
          const teamKey = teamNode.getElementsByTagName('team_key')[0]?.textContent || '';
          const teamName = teamNode.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
          
          // Get league info
          const leagueNode = teamNode.getElementsByTagName('league')[0];
          console.log('League node', i, ':', leagueNode);
          
          const leagueKey = leagueNode?.getElementsByTagName('league_key')[0]?.textContent || '';
          const leagueName = leagueNode?.getElementsByTagName('name')[0]?.textContent || 'Unknown League';
          
          // Get season info
          const season = leagueNode?.getElementsByTagName('season')[0]?.textContent || '';
          
          // Get additional info for better team selection
          const isFinished = leagueNode?.getElementsByTagName('is_finished')[0]?.textContent === '1';
          
          console.log('Team data:', { teamKey, teamName, leagueKey, leagueName, season, isFinished });
          
          teamsArray.push({
            team_key: teamKey,
            name: teamName,
            league_key: leagueKey,
            league_name: leagueName,
            season: season,
            is_finished: isFinished
          });
          
          // Add to leagues map, organized by season
          if (leagueKey && leagueName) {
            if (!leaguesMap.has(season)) {
              leaguesMap.set(season, []);
            }
            const seasonLeagues = leaguesMap.get(season);
            // Check if league already exists in this season
            const existingLeague = seasonLeagues.find(l => l.league_key === leagueKey);
            if (!existingLeague) {
              seasonLeagues.push({ 
                league_key: leagueKey, 
                name: leagueName, 
                season: season,
                is_finished: isFinished
              });
            }
          }
        }
        
        console.log('Processed teams array:', teamsArray);
        console.log('Processed leagues map:', leaguesMap);
        
        // Show all teams (simplified approach)
        const teamsToShow = teamsArray;
        
        // Get all unique leagues
        const leaguesToShow = [];
        const leagueKeysAdded = new Set();
        
        teamsToShow.forEach(team => {
          if (team.league_key && !leagueKeysAdded.has(team.league_key)) {
            const league = {
              league_key: team.league_key,
              name: team.league_name,
              season: team.season
            };
            leaguesToShow.push(league);
            leagueKeysAdded.add(team.league_key);
          }
        });
        
        console.log('Teams to show:', teamsToShow);
        console.log('Leagues to show:', leaguesToShow);
        
        setTeams(teamsToShow);
        setLeagues(leaguesToShow);
        
        // Auto-select a team if we have teams
        if (teamsToShow.length > 0) {
          // Try to select the most relevant team
          let teamToSelect = null;
          
          // Prefer active team from current fantasy season
          const currentSeasonActiveTeams = teamsToShow.filter(team => 
            team.season && parseInt(team.season) === currentFantasySeason && team.is_finished !== '1'
          );
          
          if (currentSeasonActiveTeams.length > 0) {
            teamToSelect = currentSeasonActiveTeams[0];
          } else {
            // Prefer any team from current fantasy season
            const currentSeasonTeams = teamsToShow.filter(team => 
              team.season && parseInt(team.season) === currentFantasySeason
            );
            
            if (currentSeasonTeams.length > 0) {
              teamToSelect = currentSeasonTeams[0];
            } else {
              // Just select the first team
              teamToSelect = teamsToShow[0];
            }
          }
          
          console.log('Team to select:', teamToSelect);
          
          // Only set team key if we found a team to select
          if (teamToSelect) {
            setTeamKey(teamToSelect.team_key);
            setLeagueKey(teamToSelect.league_key);
            
            // Fetch opponents for the selected league
            fetchOpponents(teamToSelect.league_key, teamToSelect.team_key);
          }
        } else {
          // Clear selections if no teams found
          setTeamKey('');
          setLeagueKey('');
          setOpponents([]);
        }
      }
    } catch (err) {
      setError('Failed to fetch user teams. Please try again.');
      console.error('Error fetching user teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpponents = async (selectedLeagueKey, currentTeamKey) => {
    try {
      const data = await fetchLeagueStandings(selectedLeagueKey);
      console.log('Raw league standings data:', data);
      
      // Handle XML response from Yahoo API
      if (typeof data === 'string' && data.includes('<?xml')) {
        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        // Log the XML structure for debugging
        console.log('League standings XML Document:', xmlDoc);
        
        // Extract teams from XML
        const teamNodes = xmlDoc.getElementsByTagName('team');
        const opponentsArray = [];
        
        console.log('Found', teamNodes.length, 'teams in league standings XML');
        
        for (let i = 0; i < teamNodes.length; i++) {
          const teamNode = teamNodes[i];
          
          // Log the team node for debugging
          console.log('League team node', i, ':', teamNode);
          
          const teamKey = teamNode.getElementsByTagName('team_key')[0]?.textContent || '';
          const teamName = teamNode.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
          
          console.log('League team data:', { teamKey, teamName });
          
          // Don't include the user's own team
          if (teamKey !== currentTeamKey) {
            opponentsArray.push({
              team_key: teamKey,
              name: teamName
            });
          }
        }
        
        console.log('Processed opponents array:', opponentsArray);
        
        setOpponents(opponentsArray);
      }
    } catch (err) {
      console.error('Error fetching opponents:', err);
    }
  };

  const handleTeamChange = (e) => {
    const selectedTeamKey = e.target.value;
    setTeamKey(selectedTeamKey);
    
    // Find the selected team and update league key
    const selectedTeam = teams.find(team => team.team_key === selectedTeamKey);
    if (selectedTeam) {
      setLeagueKey(selectedTeam.league_key);
      fetchOpponents(selectedTeam.league_key, selectedTeamKey);
    } else {
      // Clear league and opponents if no team selected
      setLeagueKey('');
      setOpponents([]);
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
                  {teams.map((team) => (
                    <option key={team.team_key} value={team.team_key}>
                      {team.name} ({team.league_name})
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
