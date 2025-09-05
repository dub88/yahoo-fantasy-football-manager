import React, { useState, useEffect } from 'react';
import { fetchUserTeams, fetchTeamRoster } from '../utils/yahooApi';

const RosterDisplay = ({ teamKey }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(teamKey || '');
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('select-team'); // 'select-team' or 'roster'

  useEffect(() => {
    if (!teamKey) {
      fetchUserTeamsData();
    }
  }, [teamKey]);

  const fetchUserTeamsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserTeams();
      console.log('User teams data:', data);
      // Extract teams data from the response
      // This will depend on the actual structure of the Yahoo API response
      setTeams(data.teams || []);
      setView('select-team');
    } catch (err) {
      setError('Failed to fetch user teams. Please try again.');
      console.error('Error fetching user teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRosterData = async (teamKeyToUse) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamRoster(teamKeyToUse);
      console.log('Roster data:', data);
      // Extract roster data from the response
      // This will depend on the actual structure of the Yahoo API response
      setRoster(data.roster || []);
      setView('roster');
    } catch (err) {
      setError('Failed to fetch roster data. Please try again.');
      console.error('Error fetching roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (teamKeyToUse) => {
    setSelectedTeam(teamKeyToUse);
    fetchRosterData(teamKeyToUse);
  };

  if (loading && view === 'select-team') {
    return <div className="text-center py-4">Loading your teams...</div>;
  }

  if (view === 'select-team') {
    if (error) {
      return (
        <div className="roster-display bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Select Your Team</h2>
          <div className="text-center py-4 text-red-500">{error}</div>
          <div className="text-center">
            <button 
              onClick={fetchUserTeamsData}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="roster-display bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Select Your Team</h2>
        {teams.length === 0 ? (
          <p className="text-gray-500">No teams found. Please make sure you're logged into Yahoo Fantasy Sports.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">Please select a team to view its roster:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTeamSelect(team.team_key)}
                >
                  <div className="font-medium text-gray-900">{team.name || 'Unknown Team'}</div>
                  <div className="text-sm text-gray-500">{team.league?.name || 'Unknown League'}</div>
                  <div className="text-xs text-gray-400 mt-1">Team Key: {team.team_key}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading && view === 'roster') {
    return <div className="text-center py-4">Loading roster...</div>;
  }

  if (view === 'roster') {
    if (error) {
      return (
        <div className="roster-display bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Team Roster</h2>
          <div className="text-center py-4 text-red-500">{error}</div>
          <div className="text-center">
            <button 
              onClick={() => setView('select-team')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-2"
            >
              Select Different Team
            </button>
            <button 
              onClick={() => fetchRosterData(selectedTeam)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="roster-display bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Team Roster</h2>
          <button 
            onClick={() => setView('select-team')}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Change Team
          </button>
        </div>
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${player.status === 'IR' ? 'bg-red-100 text-red-800' : player.status === 'O' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
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
  }

  return null;
};

export default RosterDisplay;
