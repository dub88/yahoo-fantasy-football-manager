import React, { useState, useEffect } from 'react';
import { fetchUserTeams, fetchTeamRosterWithPoints } from '../utils/yahooApi';

const RosterDisplay = ({ teamKey }) => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (teamKey) {
      fetchRosterData(teamKey);
    }
  }, [teamKey]);

  const fetchRosterData = async (teamKeyToUse) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamRosterWithPoints(teamKeyToUse);
      console.log('Roster data with points:', data);
      
      // Handle XML response from Yahoo API
      if (typeof data === 'string' && data.includes('<?xml')) {
        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        // Extract roster from XML
        const rosterNodes = xmlDoc.getElementsByTagName('player');
        const rosterArray = [];
        
        for (let i = 0; i < rosterNodes.length; i++) {
          const playerNode = rosterNodes[i];
          const playerName = playerNode.getElementsByTagName('full')[0]?.textContent || 'Unknown Player';
          const playerPosition = playerNode.getElementsByTagName('primary_position')[0]?.textContent || 'N/A';
          const playerTeam = playerNode.getElementsByTagName('editorial_team_abbr')[0]?.textContent || 'N/A';
          const playerStatus = playerNode.getElementsByTagName('status')[0]?.textContent || 'Active';
          
          // Get player points
          let playerPoints = 'N/A';
          let playerProjectedPoints = 'N/A';
          
          // Try to get actual points
          const playerPointsNode = playerNode.getElementsByTagName('player_points')[0];
          if (playerPointsNode) {
            const totalNode = playerPointsNode.getElementsByTagName('total')[0];
            if (totalNode) {
              playerPoints = totalNode.textContent || 'N/A';
            }
          }
          
          // Try to get projected points
          const playerProjectedPointsNode = playerNode.getElementsByTagName('player_projected_points')[0];
          if (playerProjectedPointsNode) {
            const totalNode = playerProjectedPointsNode.getElementsByTagName('total')[0];
            if (totalNode) {
              playerProjectedPoints = totalNode.textContent || 'N/A';
            }
          }
          
          rosterArray.push({
            name: { full: playerName },
            primary_position: playerPosition,
            editorial_team_abbr: playerTeam,
            status: playerStatus,
            points: playerPoints,
            projected_points: playerProjectedPoints
          });
        }
        
        setRoster(rosterArray);
      } else if (data && typeof data === 'object') {
        // Handle JSON response if it's not XML
        setRoster(data.roster || []);
      } else {
        setRoster([]);
      }
    } catch (err) {
      setError('Failed to fetch roster data. Please try again.');
      console.error('Error fetching roster:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading roster...</div>;
  }

  if (error) {
    return (
      <div className="roster-display bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Team Roster</h2>
        <div className="text-center py-4 text-red-500">{error}</div>
        <div className="text-center">
          <button 
            onClick={() => fetchRosterData(teamKey)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!teamKey) {
    return (
      <div className="roster-display bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Team Roster</h2>
        <p className="text-gray-500">Please select a team from the dropdown above to view its roster.</p>
      </div>
    );
  }

  return (
    <div className="roster-display bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Team Roster</h2>
      {roster.length === 0 ? (
        <p className="text-gray-500">No roster data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projected Points</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roster.map((player, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.name?.full || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{player.primary_position || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{player.editorial_team_abbr || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${player.status === 'IR' ? 'bg-red-100 text-red-800' : player.status === 'O' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {player.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{player.points || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{player.projected_points || 'N/A'}</div>
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

export default RosterDisplay;
