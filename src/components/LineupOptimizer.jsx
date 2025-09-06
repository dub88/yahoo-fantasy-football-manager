import React, { useEffect, useMemo, useState } from 'react';
import * as yahooApi from '../utils/yahooApi.js';

// Simple allowed sets for flex slots
const FLEX_MAP = {
  'W/R/T': new Set(['WR', 'RB', 'TE']),
  'W/T': new Set(['WR', 'TE']),
  'R/W': new Set(['RB', 'WR']),
  'Q/W/R/T': new Set(['QB', 'WR', 'RB', 'TE']), // superflex
};

const LineupOptimizer = ({ teamKey }) => {
  const [currentWeek, setCurrentWeek] = useState('1');
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [isProjected, setIsProjected] = useState(true);
  const [includeBench, setIncludeBench] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [slots, setSlots] = useState([]); // e.g., ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'W/R/T', 'K', 'DEF']
  const [players, setPlayers] = useState([]); // parsed roster players
  const [optimized, setOptimized] = useState({ starters: [], bench: [], total: 0 });
  const [showDebug, setShowDebug] = useState(false);

  const leagueKey = useMemo(() => deriveLeagueKeyFromTeamKey(teamKey), [teamKey]);

  useEffect(() => {
    if (!teamKey) return;
    bootstrap();
  }, [teamKey]);

  useEffect(() => {
    if (!teamKey) return;
    loadRosterAndSettings();
  }, [selectedWeek, isProjected, includeBench, teamKey]);

  const bootstrap = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get current week from team matchup API (same method as Matchup Analysis)
      const matchupXml = await yahooApi.fetchCurrentMatchup(teamKey);
      const parser = new DOMParser();
      const doc = parser.parseFromString(matchupXml, 'text/xml');
      const weekEl = doc.getElementsByTagName('week')[0];
      const w = weekEl ? weekEl.textContent : '1';
      setCurrentWeek(w);
      setSelectedWeek(w);
    } catch (e) {
      console.warn('Failed to get current week, defaulting to 1', e);
      setCurrentWeek('1');
      setSelectedWeek('1');
    } finally {
      setLoading(false);
    }
  };

  const loadRosterAndSettings = async () => {
    if (!teamKey) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch league settings to determine roster slots
      let leagueSlots = [];
      if (leagueKey) {
        const settingsXml = await yahooApi.fetchLeagueSettings(leagueKey);
        leagueSlots = parseRosterSlotsFromSettings(settingsXml);
      }
      setSlots(leagueSlots);

      // Fetch weekly roster
      const xml = await yahooApi.fetchTeamRosterWeekly(teamKey, selectedWeek, isProjected);
      let parsed = parseRosterPlayers(xml, includeBench);

      // Enrich missing points via batch weekly stats if needed
      const missingKeys = parsed.filter(p => !p.points || isNaN(p.points) || p.points === 0).map(p => p.key);
      if (missingKeys.length > 0) {
        try {
          const playersXml = await yahooApi.fetchPlayersWeeklyStats(missingKeys, selectedWeek, isProjected);
          const updatedMap = parsePlayerTotalsMap(playersXml);
          parsed = parsed.map(p => ({ ...p, points: updatedMap.get(p.key) ?? p.points }));
        } catch (e) {
          console.warn('Batch weekly stats enrichment failed', e);
        }
      }

      setPlayers(parsed);
      // Run optimization
      const result = optimizeLineup(leagueSlots, parsed);
      setOptimized(result);
    } catch (e) {
      console.error('Failed to load optimizer data:', e);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lineup-optimizer bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Lineup Optimizer</h2>
        <div className="flex items-center gap-2">
          <div className="yahoo-segmented">
            <button
              className={isProjected ? 'active' : ''}
              onClick={() => setIsProjected(true)}
            >Projected</button>
            <button
              className={!isProjected ? 'active' : ''}
              onClick={() => setIsProjected(false)}
            >Actual</button>
          </div>
          <div className="flex items-center gap-2">
            <label className="yahoo-label m-0">Week</label>
            <select className="yahoo-select" value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
              {Array.from({ length: 18 }, (_, i) => String(i + 1)).map((wk) => (
                <option key={wk} value={wk}>Week {wk}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 yahoo-label m-0">
            <input type="checkbox" checked={includeBench} onChange={(e) => setIncludeBench(e.target.checked)} />
            Include Bench/IR in pool
          </label>
          <button className="yahoo-button secondary" onClick={() => setShowDebug(!showDebug)}>{showDebug ? 'Hide' : 'Show'} Debug</button>
        </div>
      </div>

      {loading && <div className="text-center py-4">Loading...</div>}
      {error && <div className="yahoo-alert error mb-4">{error}</div>}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Optimized Starters */}
          <div className="yahoo-card">
            <div className="yahoo-card-header">Suggested Starters</div>
            <div className="yahoo-card-body">
              {optimized.starters.length === 0 ? (
                <div className="text-gray-500">No starters found.</div>
              ) : (
                <table className="yahoo-table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Player</th>
                      <th>Pos</th>
                      <th className="text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimized.starters.map((s, idx) => (
                      <tr key={idx}>
                        <td>{s.slot}</td>
                        <td>{s.player?.name || '-'}</td>
                        <td>{s.player?.position || '-'}</td>
                        <td className="text-right">{formatPts(s.player?.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="text-right font-semibold">Total</td>
                      <td className="text-right font-semibold">{formatPts(optimized.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Bench */}
          <div className="yahoo-card">
            <div className="yahoo-card-header">Bench (not used)</div>
            <div className="yahoo-card-body">
              {optimized.bench.length === 0 ? (
                <div className="text-gray-500">No bench players.</div>
              ) : (
                <table className="yahoo-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Pos</th>
                      <th className="text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimized.bench.map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.name}</td>
                        <td>{p.position}</td>
                        <td className="text-right">{formatPts(p.points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Debug */}
          {showDebug && (
            <div className="yahoo-card">
              <div className="yahoo-card-header">Debug</div>
              <div className="yahoo-card-body space-y-4">
                <div>
                  <div className="font-semibold mb-1">Slots</div>
                  <pre className="bg-gray-50 p-3 rounded text-xs">{JSON.stringify(slots, null, 2)}</pre>
                </div>
                <div>
                  <div className="font-semibold mb-1">Players ({players.length})</div>
                  <pre className="bg-gray-50 p-3 rounded text-xs">{JSON.stringify(players.slice(0, 50), null, 2)}{players.length > 50 ? '\n...truncated' : ''}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ===== Helpers =====

const formatPts = (n) => (n || n === 0) ? Number(n).toFixed(1) : '-';

const deriveLeagueKeyFromTeamKey = (tKey) => {
  if (!tKey) return null;
  const parts = tKey.split('.');
  if (parts.length < 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
};

// Parse roster slots from league settings XML
const parseRosterSlotsFromSettings = (settingsXml) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(settingsXml, 'text/xml');
    const positionsNode = doc.getElementsByTagName('roster_positions')[0];
    const slots = [];
    if (!positionsNode) return slots;
    const posNodes = positionsNode.getElementsByTagName('roster_position');
    for (let i = 0; i < posNodes.length; i++) {
      const p = posNodes[i];
      const pos = p.getElementsByTagName('position')[0]?.textContent;
      const count = parseInt(p.getElementsByTagName('count')[0]?.textContent || '0', 10);
      if (!pos || !count) continue;
      if (pos === 'BN' || pos === 'IR' || pos === 'IR+' || pos === 'NA') continue; // not starters
      for (let c = 0; c < count; c++) slots.push(pos);
    }
    return slots;
  } catch (e) {
    console.warn('Failed to parse roster slots from settings:', e);
    return [];
  }
};

// Parse player totals map from players weekly stats XML
const parsePlayerTotalsMap = (playersXml) => {
  const map = new Map();
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(playersXml, 'text/xml');
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
        if (pointsNode && !isNaN(parseFloat(pointsNode.textContent))) val = parseFloat(pointsNode.textContent);
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
      if (key) map.set(key, val || 0);
    }
  } catch (e) {
    console.warn('Failed parsing players totals map', e);
  }
  return map;
};

// Parse roster players from weekly roster XML
const parseRosterPlayers = (xml, includeBenchFlag) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const playerNodes = doc.getElementsByTagName('player');
    const out = [];
    for (let i = 0; i < playerNodes.length; i++) {
      const node = playerNodes[i];
      const key = node.getElementsByTagName('player_key')[0]?.textContent || null;
      const nameNode = node.getElementsByTagName('name')[0];
      const name = nameNode?.getElementsByTagName('full')[0]?.textContent || nameNode?.textContent || 'Unknown';
      const selectedPosNode = node.getElementsByTagName('selected_position')[0];
      const selected = selectedPosNode?.getElementsByTagName('position')[0]?.textContent || null;
      const displayPosNode = node.getElementsByTagName('display_position')[0] || node.getElementsByTagName('position')[0];
      const basePos = displayPosNode?.textContent || 'UTIL';

      // eligible positions
      const eligible = [];
      const eligibleNode = node.getElementsByTagName('eligible_positions')[0];
      if (eligibleNode) {
        const posNodes = eligibleNode.getElementsByTagName('position');
        for (let p = 0; p < posNodes.length; p++) eligible.push(posNodes[p].textContent);
      } else {
        eligible.push(basePos);
      }

      // points
      let points = 0;
      const playerPointsNode = node.getElementsByTagName('player_points')[0];
      if (playerPointsNode) {
        const totalAttr = playerPointsNode.getAttribute('total');
        if (totalAttr && !isNaN(parseFloat(totalAttr))) points = parseFloat(totalAttr);
        else {
          const totalNode = playerPointsNode.getElementsByTagName('total')[0];
          if (totalNode && !isNaN(parseFloat(totalNode.textContent))) points = parseFloat(totalNode.textContent);
        }
      }
      if ((!points || isNaN(points))) {
        const pointsNode = node.getElementsByTagName('points')[0];
        if (pointsNode && !isNaN(parseFloat(pointsNode.textContent))) points = parseFloat(pointsNode.textContent);
      }
      if (!points || isNaN(points)) points = 0;

      // skip bench/IR unless included in pool
      const slotToCheck = selected || basePos;
      if (!includeBenchFlag && ['BN', 'IR', 'IRR', 'NA'].includes(slotToCheck)) continue;

      out.push({ key, name, position: basePos, eligiblePositions: eligible, points });
    }
    return out;
  } catch (e) {
    console.warn('Failed to parse roster players', e);
    return [];
  }
};

// Greedy lineup optimization heuristic
const optimizeLineup = (slots, players) => {
  // Clone arrays
  const remaining = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
  const starters = [];

  // Separate fixed position slots and flexible slots
  const fixedSlots = [];
  const flexSlots = [];
  for (const s of slots) {
    if (FLEX_MAP[s]) flexSlots.push(s);
    else fixedSlots.push(s);
  }

  // Fill fixed slots by best available of exact position
  for (const slot of fixedSlots) {
    const idx = remaining.findIndex(p => matchesSlot(slot, p));
    if (idx !== -1) {
      const player = remaining.splice(idx, 1)[0];
      starters.push({ slot, player });
    } else {
      starters.push({ slot, player: null });
    }
  }

  // Fill flex slots by best remaining that fits allowed set
  for (const slot of flexSlots) {
    const idx = remaining.findIndex(p => matchesSlot(slot, p));
    if (idx !== -1) {
      const player = remaining.splice(idx, 1)[0];
      starters.push({ slot, player });
    } else {
      starters.push({ slot, player: null });
    }
  }

  // Total
  const total = starters.reduce((sum, s) => sum + (s.player?.points || 0), 0);
  const bench = remaining; // not used
  // Sort starters by typical display order: QB, RB, WR, TE, FLEX variants, K, DEF
  const order = ['QB', 'RB', 'WR', 'TE', 'W/R/T', 'W/T', 'R/W', 'Q/W/R/T', 'K', 'DEF'];
  starters.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
  return { starters, bench, total };
};

const matchesSlot = (slot, player) => {
  if (FLEX_MAP[slot]) {
    // For flex, use player's primary position and eligible positions
    const allowed = FLEX_MAP[slot];
    // allow if primary matches or any eligible matches
    if (allowed.has(player.position)) return true;
    if (player.eligiblePositions?.some(pos => allowed.has(pos))) return true;
    return false;
  }
  // Exact position slot
  return player.position === slot || player.eligiblePositions?.includes(slot);
};

export default LineupOptimizer;
