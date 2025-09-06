import React, { useState, useEffect } from 'react';
import { fetchPlayerOwnership } from '../utils/yahooApi';

const PlayerRankings = ({ leagueKey }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('percent_owned');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (leagueKey) {
      fetchPlayerRankings();
    }
  }, [leagueKey]);

  const fetchPlayerRankings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlayerOwnership(leagueKey);
      console.log('Player ownership data:', data);
      
      // Handle XML response from Yahoo API
      if (typeof data === 'string' && data.includes('<?xml')) {
        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        // Extract players from XML
        const playerNodes = xmlDoc.getElementsByTagName('player');
        const playersArray = [];
        
        for (let i = 0; i < playerNodes.length; i++) {
          const playerNode = playerNodes[i];
          const playerId = playerNode.getElementsByTagName('player_id')[0]?.textContent || '';
          const playerName = playerNode.getElementsByTagName('full')[0]?.textContent || 'Unknown Player';
          const playerPosition = playerNode.getElementsByTagName('primary_position')[0]?.textContent || 'N/A';
          const playerTeam = playerNode.getElementsByTagName('editorial_team_abbr')[0]?.textContent || 'N/A';
          
          // Get ownership percentage
          const ownershipNode = playerNode.getElementsByTagName('percent_owned')[0];
          const ownershipValue = ownershipNode?.getElementsByTagName('value')[0]?.textContent || '0';
          
          playersArray.push({
            player_id: playerId,
            name: { full: playerName },
            primary_position: playerPosition,
            editorial_team_abbr: playerTeam,
            percent_owned: parseFloat(ownershipValue)
          });
        }
        
        setPlayers(playersArray);
      } else if (data && typeof data === 'object') {
        // Handle JSON response if it's not XML
        setPlayers(data.players || []);
      } else {
        setPlayers([]);
      }
    } catch (err) {
      setError('Failed to fetch player rankings. Please try again.');
      console.error('Error fetching player rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a[sortBy] > b[sortBy] ? 1 : -1;
    } else {
      return a[sortBy] < b[sortBy] ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading player rankings...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (!leagueKey) {
    return <div className="text-center py-4">Please select a league to view player rankings.</div>;
  }

  return (
    <div className="player-rankings bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Player Rankings</h2>
        <button 
          onClick={fetchPlayerRankings}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>
      
      {players.length === 0 ? (
        <p className="text-gray-500">No player rankings available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name.full')}
                >
                  Player
                  {sortBy === 'name.full' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('primary_position')}
                >
                  Position
                  {sortBy === 'primary_position' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('editorial_team_abbr')}
                >
                  Team
                  {sortBy === 'editorial_team_abbr' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('percent_owned')}
                >
                  Ownership %
                  {sortBy === 'percent_owned' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPlayers.map((player, index) => (
                <tr key={index} className="hover:bg-gray-50">
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
                    <div className="text-sm text-gray-500">{player.percent_owned?.toFixed(2) || '0.00'}%</div>
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

export default PlayerRankings;
