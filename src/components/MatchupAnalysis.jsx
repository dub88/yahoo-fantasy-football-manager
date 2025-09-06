import React, { useState, useEffect } from 'react';
import { fetchTeamRosterWithDetails, fetchCurrentMatchup } from '../utils/yahooApi';

const MatchupAnalysis = ({ teamKey, opponentKey, onOpponentChange }) => {
  const [teamData, setTeamData] = useState(null);
  const [opponentData, setOpponentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState('1');

  useEffect(() => {
    // When the component mounts or teamKey changes, fetch the current matchup
    if (teamKey) {
      fetchCurrentMatchupData();
    }
  }, [teamKey]);

  // Fetch the current week's matchup for the selected team
  const fetchCurrentMatchupData = async () => {
    if (!teamKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the current matchup for the team
      const matchupData = await fetchCurrentMatchup(teamKey);
      console.log('Matchup Data:', matchupData); // Debug log
      
      // Parse the XML response to extract matchup information
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(matchupData, 'text/xml');
      
      // Check for XML parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('Failed to parse matchup data');
      }
      
      // Extract the current week
      const weekEl = xmlDoc.getElementsByTagName('week')[0];
      const week = weekEl ? weekEl.textContent : '1';
      setCurrentWeek(week);
      
      // Extract team matchups
      const matchupNodes = xmlDoc.getElementsByTagName('matchup');
      let opponentTeamKey = null;
      
      // Find the team that isn't the current team
      for (let i = 0; i < matchupNodes.length; i++) {
        const teams = matchupNodes[i].getElementsByTagName('team');
        for (let j = 0; j < teams.length; j++) {
          const teamKeyEl = teams[j].getElementsByTagName('team_key')[0];
          if (teamKeyEl && teamKeyEl.textContent !== teamKey) {
            opponentTeamKey = teamKeyEl.textContent;
            break;
          }
        }
        if (opponentTeamKey) break;
      }
      
      // If we found an opponent, fetch both team details
      if (opponentTeamKey) {
        // Update the parent component with the opponent key
        if (onOpponentChange) {
          onOpponentChange(opponentTeamKey);
        }
        
        // Fetch both team rosters in parallel
        const [teamRoster, opponentRoster] = await Promise.all([
          fetchTeamRosterWithDetails(teamKey),
          fetchTeamRosterWithDetails(opponentTeamKey)
        ]);
        
        // Process team rosters
        const teamInfo = processTeamRoster(teamRoster, 'Your Team');
        const opponentInfo = processTeamRoster(opponentRoster, 'Opponent');
        
        setTeamData(teamInfo);
        setOpponentData(opponentInfo);
      } else {
        // No opponent found (bye week?)
        const teamRoster = await fetchTeamRosterWithDetails(teamKey);
        const teamInfo = processTeamRoster(teamRoster, 'Your Team');
        setTeamData(teamInfo);
        setOpponentData(null);
      }
    } catch (err) {
      setError('Failed to load matchup data. Please try again.');
      console.error('Error fetching matchup data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Process team roster data into a format we can use
  const processTeamRoster = (rosterData, defaultTeamName) => {
    if (!rosterData) return null;
    
    try {
      console.log('Processing roster data for:', defaultTeamName); // Debug log
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rosterData, 'text/xml');
      
      // Check for XML parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        console.error('XML Parse Error:', parserError[0].textContent);
        return null;
      }
      
      // Extract team name
      const teamNode = xmlDoc.getElementsByTagName('team')[0];
      if (!teamNode) {
        console.error('No team node found in roster data');
        return null;
      }
      
      const nameNode = teamNode.getElementsByTagName('name')[0];
      const teamName = nameNode ? nameNode.textContent : defaultTeamName;
      
      // Extract players
      const playerNodes = xmlDoc.getElementsByTagName('player');
      const roster = [];
      let totalProjectedPoints = 0;
      
      for (let i = 0; i < playerNodes.length; i++) {
        const playerNode = playerNodes[i];
        const nameNode = playerNode.getElementsByTagName('name')[0];
        const positionNode = playerNode.getElementsByTagName('display_position')[0] || 
                            playerNode.getElementsByTagName('position')[0];
        const pointsNode = playerNode.getElementsByTagName('points')[0];
        
        if (nameNode && positionNode) {
          const name = nameNode.getElementsByTagName('full')[0]?.textContent || 
                      nameNode.textContent;
          const position = positionNode.textContent;
          const projectedPoints = pointsNode ? parseFloat(pointsNode.textContent) : 0;
          
          totalProjectedPoints += projectedPoints;
          
          roster.push({
            name,
            position,
            projectedPoints: projectedPoints.toFixed(1)
          });
        }
      }
      
      // Sort roster by position for better display
      roster.sort((a, b) => a.position.localeCompare(b.position));
      
      // Simple analysis of strengths/weaknesses (this is a simplified version)
      const positionGroups = {};
      roster.forEach(player => {
        positionGroups[player.position] = (positionGroups[player.position] || 0) + 1;
      });
      
      const strengths = [];
      const weaknesses = [];
      
      // This is a simplified analysis - in a real app, you'd want more sophisticated logic
      Object.entries(positionGroups).forEach(([pos, count]) => {
        if (count >= 2) {
          strengths.push(`${pos}s`);
        }
      });
      
      if (strengths.length === 0) {
        strengths.push('Balanced roster');
      }
      
      if (roster.length < 8) {
        weaknesses.push('Short on depth');
      }
      
      return {
        name: teamName,
        projectedPoints: totalProjectedPoints.toFixed(1),
        roster,
        strengths: strengths.length > 0 ? strengths : ['Balanced'],
        weaknesses: weaknesses.length > 0 ? weaknesses : ['None identified']
      };
    } catch (err) {
      console.error('Error processing roster data:', err);
      return null;
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
