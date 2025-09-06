import React, { useState, useEffect } from 'react';

const MatchupAnalysis = ({ teamKey, opponentKey }) => {
  const [teamData, setTeamData] = useState(null);
  const [opponentData, setOpponentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (teamKey && opponentKey) {
      analyzeMatchup();
    }
  }, [teamKey, opponentKey]);

  const analyzeMatchup = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real implementation, we would fetch actual team data from the Yahoo API
      // For now, we'll simulate the data
      const mockTeamData = {
        name: 'Your Team',
        projectedPoints: 125.5,
        roster: [
          { name: 'Player 1', position: 'QB', projectedPoints: 18.2 },
          { name: 'Player 2', position: 'RB', projectedPoints: 12.7 },
          { name: 'Player 3', position: 'WR', projectedPoints: 10.5 },
        ],
        strengths: ['Running Backs', 'Tight Ends'],
        weaknesses: ['Quarterback', 'Defense']
      };
      
      const mockOpponentData = {
        name: 'Opponent Team',
        projectedPoints: 118.3,
        roster: [
          { name: 'Player A', position: 'QB', projectedPoints: 16.8 },
          { name: 'Player B', position: 'RB', projectedPoints: 14.2 },
          { name: 'Player C', position: 'WR', projectedPoints: 9.8 },
        ],
        strengths: ['Wide Receivers', 'Kicker'],
        weaknesses: ['Running Backs', 'Defense']
      };
      
      setTeamData(mockTeamData);
      setOpponentData(mockOpponentData);
    } catch (err) {
      setError('Failed to analyze matchup. Please try again.');
      console.error('Error analyzing matchup:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Analyzing matchup...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (!teamKey || !opponentKey) {
    return <div className="text-center py-4">Please select both your team and an opponent to analyze the matchup.</div>;
  }

  return (
    <div className="matchup-analysis bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Matchup Analysis</h2>
      
      {teamData && opponentData ? (
        <div className="space-y-6">
          {/* Matchup Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Matchup Summary</h3>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{teamData.projectedPoints}</div>
                <div className="text-sm text-gray-500">{teamData.name}</div>
              </div>
              <div className="text-lg font-bold text-gray-400">VS</div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">{opponentData.projectedPoints}</div>
                <div className="text-sm text-gray-500">{opponentData.name}</div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {teamData.projectedPoints > opponentData.projectedPoints ? 'You are projected to win' : 'You are projected to lose'}
              </span>
            </div>
          </div>
          
          {/* Team Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Team */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-blue-600">{teamData.name}</h4>
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Projected Starting Roster</h5>
                <ul className="space-y-1">
                  {teamData.roster.map((player, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span>{player.name} ({player.position})</span>
                      <span className="font-medium">{player.projectedPoints}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Strengths</h5>
                <div className="flex flex-wrap gap-1">
                  {teamData.strengths.map((strength, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-1">Weaknesses</h5>
                <div className="flex flex-wrap gap-1">
                  {teamData.weaknesses.map((weakness, index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      {weakness}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Opponent Team */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-red-600">{opponentData.name}</h4>
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Projected Starting Roster</h5>
                <ul className="space-y-1">
                  {opponentData.roster.map((player, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span>{player.name} ({player.position})</span>
                      <span className="font-medium">{player.projectedPoints}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-3">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Strengths</h5>
                <div className="flex flex-wrap gap-1">
                  {opponentData.strengths.map((strength, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-1">Weaknesses</h5>
                <div className="flex flex-wrap gap-1">
                  {opponentData.weaknesses.map((weakness, index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                      {weakness}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Start your strong RBs against their weak RB defense</li>
              <li>Consider benching your QB if their defense is strong against QBs</li>
              <li>Target their weak WR positions with your strong WRs</li>
              <li>Monitor injury reports before finalizing your lineup</li>
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">No matchup data available.</p>
      )}
    </div>
  );
};

export default MatchupAnalysis;
