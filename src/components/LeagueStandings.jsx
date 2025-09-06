import React, { useState, useEffect } from 'react';
import { fetchLeagueStandings } from '../utils/yahooApi.js';

const LeagueStandings = ({ leagueKey }) => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (leagueKey) {
      fetchLeagueStandingsData();
    }
  }, [leagueKey]);

  const fetchLeagueStandingsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeagueStandings(leagueKey);
      console.log('League standings data:', data);
      
      // Handle XML response from Yahoo API
      if (typeof data === 'string' && data.includes('<?xml')) {
        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        // Extract standings from XML
        const teamNodes = xmlDoc.getElementsByTagName('team');
        const standingsArray = [];
        
        for (let i = 0; i < teamNodes.length; i++) {
          const teamNode = teamNodes[i];
          const teamKey = teamNode.getElementsByTagName('team_key')[0]?.textContent || '';
          const teamName = teamNode.getElementsByTagName('name')[0]?.textContent || 'Unknown Team';
          
          // Get standings info
          const teamStandingsNode = teamNode.getElementsByTagName('team_standings')[0];
          const rank = teamStandingsNode?.getElementsByTagName('rank')[0]?.textContent || '';
          const wins = teamStandingsNode?.getElementsByTagName('wins')[0]?.textContent || '0';
          const losses = teamStandingsNode?.getElementsByTagName('losses')[0]?.textContent || '0';
          const ties = teamStandingsNode?.getElementsByTagName('ties')[0]?.textContent || '0';
          
          // Calculate win percentage
          const totalGames = parseInt(wins) + parseInt(losses) + parseInt(ties);
          const winPercentage = totalGames > 0 ? (parseInt(wins) / totalGames * 100).toFixed(1) : '0.0';
          
          standingsArray.push({
            team_key: teamKey,
            name: teamName,
            rank: parseInt(rank),
            wins: parseInt(wins),
            losses: parseInt(losses),
            ties: parseInt(ties),
            win_percentage: winPercentage
          });
        }
        
        // Sort by rank
        standingsArray.sort((a, b) => a.rank - b.rank);
        setStandings(standingsArray);
      } else if (data && typeof data === 'object') {
        // Handle JSON response if it's not XML
        setStandings(data.standings || []);
      } else {
        setStandings([]);
      }
    } catch (err) {
      setError('Failed to fetch league standings. Please try again.');
      console.error('Error fetching league standings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading league standings...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (!leagueKey) {
    return <div className="text-center py-4">Please select a league to view standings.</div>;
  }

  return (
    <div className="league-standings bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">League Standings</h2>
        <button 
          onClick={fetchLeagueStandingsData}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {standings.length === 0 ? (
        <p className="text-gray-500">No standings available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Win %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {standings.map((team, index) => (
                <tr 
                  key={index} 
                  className={team.rank === 1 ? 'bg-yellow-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{team.rank}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{team.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{team.wins}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{team.losses}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{team.ties}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{team.win_percentage}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeagueStandings;
