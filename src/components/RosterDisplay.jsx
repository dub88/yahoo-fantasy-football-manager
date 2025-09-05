import React, { useState, useEffect } from 'react';
import { fetchTeamRoster } from '../utils/yahooApi';

const RosterDisplay = ({ teamKey }) => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (teamKey) {
      fetchRosterData();
    }
  }, [teamKey]);

  const fetchRosterData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamRoster(teamKey);
      // Extract roster data from the response
      // This will depend on the actual structure of the Yahoo API response
      setRoster(data.roster || []);
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
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (!teamKey) {
    return <div className="text-center py-4">Please provide a team key to view roster.</div>;
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${player.status === 'IR' ? 'bg-red-100 text-red-800' : 
                        player.status === 'O' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {player.status || 'Active'}
                    </span>
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
