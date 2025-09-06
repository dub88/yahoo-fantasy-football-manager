import React, { useState, useEffect } from 'react';
import { fetchTeamRosterWeekly, fetchPlayersWeeklyStats, fetchCurrentMatchup, fetchLeagueSettings } from '../utils/yahooApi';

const MatchupAnalysis = ({ teamKey, opponentKey, onOpponentChange }) => {
  const [teamData, setTeamData] = useState(null);
  const [opponentData, setOpponentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState('1');
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [isProjected, setIsProjected] = useState(true);
  const [includeBench, setIncludeBench] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

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
      setSelectedWeek(week);
      
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
        
        // Fetch both team rosters in parallel for the current week (includes player_points)
        const [teamRoster, opponentRoster] = await Promise.all([
          fetchTeamRosterWeekly(teamKey, week, isProjected),
          fetchTeamRosterWeekly(opponentTeamKey, week, isProjected)
        ]);
        
        // Process team rosters
        let teamInfo = processTeamRoster(teamRoster, 'Your Team', includeBench);
        let opponentInfo = processTeamRoster(opponentRoster, 'Opponent', includeBench);
        // Fallback: enrich any zero totals from batch weekly stats
        teamInfo = await enrichWithWeeklyStats(teamInfo, week);
        opponentInfo = await enrichWithWeeklyStats(opponentInfo, week);
        
        setTeamData(teamInfo);
        setOpponentData(opponentInfo);
      } else {
        // No opponent found (bye week?)
        const teamRoster = await fetchTeamRosterWeekly(teamKey, week, isProjected);
        let teamInfo = processTeamRoster(teamRoster, 'Your Team', includeBench);
        teamInfo = await enrichWithWeeklyStats(teamInfo, week);
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

  // Enrich a team info object by fetching weekly stats for players missing totals
  const enrichWithWeeklyStats = async (teamInfo, week) => {
    try {
      if (!teamInfo || !teamInfo.roster) return teamInfo;
      const missingKeys = teamInfo.roster
        .filter(p => (p.key && (p.projectedPoints === undefined || p.projectedPoints === null || isNaN(parseFloat(p.projectedPoints)) || parseFloat(p.projectedPoints) === 0)))
        .map(p => p.key);
      if (missingKeys.length === 0) return teamInfo;

      const xml = await fetchPlayersWeeklyStats(missingKeys, week, isProjected);
      if (!xml) return teamInfo;
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const map = new Map();
      const players = doc.getElementsByTagName('player');
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const key = p.getElementsByTagName('player_key')[0]?.textContent;
        let val = 0;
        const playerPointsNode = p.getElementsByTagName('player_points')[0];
        if (playerPointsNode) {
          const totalAttr = playerPointsNode.getAttribute('total');
          if (totalAttr && !isNaN(parseFloat(totalAttr))) {
            val = parseFloat(totalAttr);
          } else {
            const totalNode = playerPointsNode.getElementsByTagName('total')[0];
            if (totalNode && !isNaN(parseFloat(totalNode.textContent))) {
              val = parseFloat(totalNode.textContent);
            }
          }
        }
        if ((!val || isNaN(val))) {
          const pointsNode = p.getElementsByTagName('points')[0];
          if (pointsNode && !isNaN(parseFloat(pointsNode.textContent))) {
            val = parseFloat(pointsNode.textContent);
          }
        }
        if ((!val || isNaN(val))) {
          const stats = p.getElementsByTagName('player_stats')[0];
          if (stats) {
            const statNodes = stats.getElementsByTagName('stat');
            for (let s = 0; s < statNodes.length; s++) {
              const statNode = statNodes[s];
              const statId = statNode.getElementsByTagName('stat_id')[0]?.textContent;
              const valueNode = statNode.getElementsByTagName('value')[0];
              if ((statId === '900' || statId === 'PTS') && valueNode && !isNaN(parseFloat(valueNode.textContent))) {
                val = parseFloat(valueNode.textContent);
                break;
              }
            }
          }
        }
        if (key) {
          map.set(key, val || 0);
        }
      }
      // Apply updates
      let total = 0;
      teamInfo.roster = teamInfo.roster.map(p => {
        const prev = parseFloat(p.projectedPoints) || 0;
        const has = p.key && map.has(p.key);
        const v = has ? map.get(p.key) : prev;
        total += v;
        return { ...p, projectedPoints: v.toFixed(1), source: has ? 'batch' : (p.source || p.source) };
      });
      teamInfo.projectedPoints = total.toFixed(1);
      return teamInfo;
    } catch (e) {
      console.warn('Failed to enrich weekly stats:', e);
      // Final fallback: compute from league scoring settings using player_stats
      try {
        const leagueKey = deriveLeagueKeyFromTeamKey(teamKey);
        if (!leagueKey) return teamInfo;
        const settingsXml = await fetchLeagueSettings(leagueKey);
        const scoringMap = buildScoringMap(settingsXml);
        if (!scoringMap || scoringMap.size === 0) return teamInfo;

        // Fetch all player stats for the team for this week regardless of missingKeys, to ensure we have data
        const allKeys = teamInfo.roster.map(p => p.key).filter(Boolean);
        const statsXml = await fetchPlayersWeeklyStats(allKeys, week, isProjected);
        const computed = computePointsFromStats(statsXml, scoringMap);

        let total = 0;
        teamInfo.roster = teamInfo.roster.map(p => {
          const cur = parseFloat(p.projectedPoints) || 0;
          const has = p.key && computed.has(p.key);
          const comp = has ? computed.get(p.key) : cur;
          total += comp;
          return { ...p, projectedPoints: comp.toFixed(1), source: has ? 'computed' : (p.source || p.source) };
        });
        teamInfo.projectedPoints = total.toFixed(1);
        return teamInfo;
      } catch (fallbackErr) {
        console.warn('Computed-projection fallback failed:', fallbackErr);
        return teamInfo;
      }
    }
  };

  // Build a scoring map from league settings XML (stat_id -> modifier)
  const buildScoringMap = (settingsXml) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(settingsXml, 'text/xml');
      const map = new Map();
      const modifiers = doc.getElementsByTagName('stat_modifiers')[0];
      if (!modifiers) return map;
      const statsNode = modifiers.getElementsByTagName('stats')[0] || modifiers;
      const statNodes = statsNode.getElementsByTagName('stat');
      for (let i = 0; i < statNodes.length; i++) {
        const s = statNodes[i];
        const id = s.getElementsByTagName('stat_id')[0]?.textContent;
        const val = s.getElementsByTagName('value')[0]?.textContent;
        if (id && val && !isNaN(parseFloat(val))) {
          map.set(id, parseFloat(val));
        }
      }
      return map;
    } catch (e) {
      console.warn('Failed to parse scoring map:', e);
      return new Map();
    }
  };

  // Compute per-player totals from players weekly stats XML and scoring map
  const computePointsFromStats = (playersXml, scoringMap) => {
    const result = new Map();
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(playersXml, 'text/xml');
      const players = doc.getElementsByTagName('player');
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const key = p.getElementsByTagName('player_key')[0]?.textContent;
        let sum = 0;
        const stats = p.getElementsByTagName('player_stats')[0];
        if (stats) {
          const statNodes = stats.getElementsByTagName('stat');
          for (let s = 0; s < statNodes.length; s++) {
            const statNode = statNodes[s];
            const statId = statNode.getElementsByTagName('stat_id')[0]?.textContent;
            const valueNode = statNode.getElementsByTagName('value')[0];
            if (!statId || !valueNode) continue;
            const mod = scoringMap.get(statId);
            const val = parseFloat(valueNode.textContent);
            if (mod !== undefined && !isNaN(val)) {
              sum += val * mod;
            }
          }
        }
        if (key) {
          result.set(key, sum);
        }
      }
    } catch (e) {
      console.warn('Failed computing points from stats:', e);
    }
    return result;
  };

  const deriveLeagueKeyFromTeamKey = (tKey) => {
    if (!tKey) return null;
    const parts = tKey.split('.');
    if (parts.length < 4) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}`; // game.l.league
  };

  // Load rosters for a specific week (uses current opponentKey if available)
  const loadRostersForWeek = async (week) => {
    if (!teamKey) return;
    setLoading(true);
    setError(null);
    try {
      if (opponentKey) {
        const [teamRoster, opponentRoster] = await Promise.all([
          fetchTeamRosterWeekly(teamKey, week, isProjected),
          fetchTeamRosterWeekly(opponentKey, week, isProjected)
        ]);
        let teamInfo = processTeamRoster(teamRoster, 'Your Team', includeBench);
        let opponentInfo = processTeamRoster(opponentRoster, 'Opponent', includeBench);
        teamInfo = await enrichWithWeeklyStats(teamInfo, week);
        opponentInfo = await enrichWithWeeklyStats(opponentInfo, week);
        setTeamData(teamInfo);
        setOpponentData(opponentInfo);
      } else {
        const teamRoster = await fetchTeamRosterWeekly(teamKey, week, isProjected);
        let teamInfo = processTeamRoster(teamRoster, 'Your Team', includeBench);
        teamInfo = await enrichWithWeeklyStats(teamInfo, week);
        setTeamData(teamInfo);
      }
    } catch (err) {
      console.error('Error loading rosters for selected week:', err);
      setError('Failed to load rosters for the selected week.');
    } finally {
      setLoading(false);
    }
  };

  // React when user changes week or projected/actual setting
  useEffect(() => {
    if (!teamKey) return;
    if (!selectedWeek) return;
    // Avoid double fetch on initial mount when we still don't know opponentKey
    loadRostersForWeek(selectedWeek);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, isProjected, opponentKey, teamKey]);
  
  // Process team roster data into a format we can use
  const processTeamRoster = (rosterData, defaultTeamName, includeBenchFlag = false) => {
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
        const pNameNode = playerNode.getElementsByTagName('name')[0];
        // Prefer selected_position for lineup slot; fallback to display_position/position
        const selectedPosNode = playerNode.getElementsByTagName('selected_position')[0];
        const displayPosNode = playerNode.getElementsByTagName('display_position')[0] || playerNode.getElementsByTagName('position')[0];
        // Yahoo weekly roster returns player_points with a total attribute
        const playerPointsNode = playerNode.getElementsByTagName('player_points')[0];
        const keyNode = playerNode.getElementsByTagName('player_key')[0];
        
        if (pNameNode && (selectedPosNode || displayPosNode)) {
          const name = pNameNode.getElementsByTagName('full')[0]?.textContent || 
                      pNameNode.textContent;
          const selectedSlot = selectedPosNode?.getElementsByTagName('position')[0]?.textContent || null;
          const position = selectedSlot || displayPosNode?.textContent || 'UTIL';
          
          // Skip bench/IR/NA unless includeBench is enabled
          if (!includeBenchFlag && ['BN','IR','IRR','NA'].includes(position)) {
            continue;
          }
          
          let projectedPoints = 0;
          let source = 'none';
          // 1) Preferred: <player_points total="X" /> or nested <total> node
          if (playerPointsNode) {
            const totalAttr = playerPointsNode.getAttribute('total');
            if (totalAttr && !isNaN(parseFloat(totalAttr))) {
              projectedPoints = parseFloat(totalAttr);
              source = 'player_points';
            } else {
              const totalNode = playerPointsNode.getElementsByTagName('total')[0];
              if (totalNode && totalNode.textContent && !isNaN(parseFloat(totalNode.textContent))) {
                projectedPoints = parseFloat(totalNode.textContent);
                source = 'player_points.total';
              } else if (playerPointsNode.textContent && !isNaN(parseFloat(playerPointsNode.textContent))) {
                projectedPoints = parseFloat(playerPointsNode.textContent);
                source = 'player_points.text';
              }
            }
          }

          // 2) Fallback: <points> node sometimes present on player
          if (!projectedPoints || isNaN(projectedPoints)) {
            const pointsNode = playerNode.getElementsByTagName('points')[0];
            if (pointsNode && pointsNode.textContent && !isNaN(parseFloat(pointsNode.textContent))) {
              projectedPoints = parseFloat(pointsNode.textContent);
              source = 'points';
            }
          }

          // 3) Fallback: inside <player_stats><stats><stat><stat_id>900</stat_id><value>X</value>
          if (!projectedPoints || isNaN(projectedPoints)) {
            const playerStatsNode = playerNode.getElementsByTagName('player_stats')[0];
            if (playerStatsNode) {
              const statNodes = playerStatsNode.getElementsByTagName('stat');
              for (let s = 0; s < statNodes.length; s++) {
                const statNode = statNodes[s];
                const statIdNode = statNode.getElementsByTagName('stat_id')[0];
                const valueNode = statNode.getElementsByTagName('value')[0];
                if (statIdNode && (statIdNode.textContent === '900' || statIdNode.textContent === 'PTS')) {
                  const val = valueNode?.textContent;
                  if (val && !isNaN(parseFloat(val))) {
                    projectedPoints = parseFloat(val);
                    source = 'stat900';
                    break;
                  }
                }
              }
            }
          }

          if (!projectedPoints) {
            // Last resort: ensure numeric 0
            projectedPoints = 0;
          }
          
          totalProjectedPoints += projectedPoints;
          
          roster.push({
            key: keyNode?.textContent || null,
            name,
            position,
            projectedPoints: projectedPoints.toFixed(1),
            source
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Matchup Analysis</h2>
        <div className="flex items-center gap-3">
          {/* Projected / Actual toggle */}
          <div className="flex items-center gap-1">
            <button
              className={`yahoo-button ${isProjected ? '' : 'secondary'}`}
              onClick={() => setIsProjected(true)}
              type="button"
            >Projected</button>
            <button
              className={`yahoo-button ${!isProjected ? '' : 'secondary'}`}
              onClick={() => setIsProjected(false)}
              type="button"
            >Actual</button>
          </div>
          {/* Week selector */}
          <div className="flex items-center gap-2">
            <label className="yahoo-label m-0">Week</label>
            <select
              className="yahoo-select"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {Array.from({ length: 18 }, (_, i) => String(i + 1)).map((wk) => (
                <option key={wk} value={wk}>Week {wk}</option>
              ))}
            </select>
          </div>
          {/* Include Bench/IR */}
          <label className="flex items-center gap-2 yahoo-label m-0">
            <input type="checkbox" checked={includeBench} onChange={(e) => setIncludeBench(e.target.checked)} />
            Include Bench/IR
          </label>
          {/* Debug toggle */}
          <button
            className="yahoo-button secondary"
            type="button"
            onClick={() => setShowDebug(!showDebug)}
          >{showDebug ? 'Hide' : 'Show'} Debug</button>
        </div>
      </div>
      
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

      {showDebug && (teamData || opponentData) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Debug: Projection Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team Debug */}
            {teamData && (
              <div className="yahoo-card">
                <div className="yahoo-card-header">{teamData.name} — Sources</div>
                <div className="yahoo-card-body overflow-x-auto">
                  <table className="yahoo-table text-sm">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Pos</th>
                        <th className="text-right">Pts</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.roster.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.name}</td>
                          <td>{p.position}</td>
                          <td className="text-right">{p.projectedPoints}</td>
                          <td>{p.source || 'n/a'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Opponent Debug */}
            {opponentData && (
              <div className="yahoo-card">
                <div className="yahoo-card-header">{opponentData.name} — Sources</div>
                <div className="yahoo-card-body overflow-x-auto">
                  <table className="yahoo-table text-sm">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Pos</th>
                        <th className="text-right">Pts</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opponentData.roster.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.name}</td>
                          <td>{p.position}</td>
                          <td className="text-right">{p.projectedPoints}</td>
                          <td>{p.source || 'n/a'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchupAnalysis;
