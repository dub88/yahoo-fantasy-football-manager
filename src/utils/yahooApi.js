import { getAccessToken } from './auth';

// Fetch user's games/leagues/teams through proxy
export const fetchUserGames = async () => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    console.log('Fetching user games with token');
    
    const response = await fetch(`/api/yahoo?endpoint=users;use_login=1/games`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Yahoo API proxy response for user games:', { status: response.status });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Yahoo API proxy error for user games:', errorData);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    console.log('Yahoo API proxy success for user games, data:', result);
    return result.data;
  } catch (error) {
    console.error('Error fetching user games:', error);
    throw error;
  }
};

// Fetch user's teams through proxy
export const fetchUserTeams = async () => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    console.log('Fetching user teams with token');
    
    // First get the games to find the current football game
    const gamesResponse = await fetch(`/api/yahoo?endpoint=users;use_login=1/games`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!gamesResponse.ok) {
      const errorData = await gamesResponse.json().catch(() => ({}));
      console.error('Yahoo API proxy error for user games:', errorData);
      throw new Error(`HTTP error! status: ${gamesResponse.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const gamesResult = await gamesResponse.json();
    console.log('Yahoo API proxy success for user games, data:', gamesResult);
    
    // Now fetch teams with more specific endpoint that includes leagues
    const response = await fetch(`/api/yahoo?endpoint=users;use_login=1/games/leagues/teams`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Yahoo API proxy response for user teams:', { status: response.status });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Yahoo API proxy error for user teams:', errorData);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    console.log('Yahoo API proxy success for user teams, data:', result);
    return result.data;
  } catch (error) {
    console.error('Error fetching user teams:', error);
    throw error;
  }
};

// Fetch user's team roster through proxy
export const fetchTeamRoster = async (teamKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    console.log('Fetching team roster with token and teamKey:', { teamKey });
    
    const response = await fetch(`/api/yahoo?endpoint=team/${teamKey}/roster`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Yahoo API proxy response:', { status: response.status });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Yahoo API proxy error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    console.log('Yahoo API proxy success, data length:', typeof result.data === 'string' ? result.data.length : 'JSON');
    return result.data;
  } catch (error) {
    console.error('Error fetching team roster:', error);
    throw error;
  }
};

// Fetch player stats through proxy
export const fetchPlayerStats = async (playerKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    const response = await fetch(`/api/yahoo?endpoint=players;player_keys=${playerKey}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
};

// Fetch team roster with player points through proxy
export const fetchTeamRosterWithPoints = async (teamKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    console.log('Fetching team roster with points with token and teamKey:', { teamKey });
    
    const response = await fetch(`/api/yahoo?endpoint=team/${teamKey}/roster/players/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Yahoo API proxy response for roster with points:', { status: response.status });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Yahoo API proxy error for roster with points:', errorData);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    console.log('Yahoo API proxy success for roster with points, data length:', typeof result.data === 'string' ? result.data.length : 'JSON');
    return result.data;
  } catch (error) {
    console.error('Error fetching team roster with points:', error);
    throw error;
  }
};

// Fetch league standings through proxy
export const fetchLeagueStandings = async (leagueKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    const response = await fetch(`/api/yahoo?endpoint=league/${leagueKey}/standings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching league standings:', error);
    throw error;
  }
};

// Fetch players with ownership percentage through proxy
export const fetchPlayerOwnership = async (leagueKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    const response = await fetch(`/api/yahoo?endpoint=league/${leagueKey}/players;percent_owned=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching player ownership:', error);
    throw error;
  }
};

// Fetch team matchup data for the current week
export const fetchTeamMatchup = async (teamKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    // Get the current team's matchup data
    const response = await fetch(`/api/yahoo?endpoint=team/${teamKey}/matchups`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching team matchup:', error);
    throw error;
  }
};

// Fetch current week's matchup for a team
export const fetchCurrentMatchup = async (teamKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    // Get the current week's matchup
    const response = await fetch(`/api/yahoo?endpoint=team/${teamKey}/matchups;weeks=current`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching current matchup:', error);
    throw error;
  }
};

// Fetch player news
export const fetchPlayerNews = async (playerKeys) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    // Convert array of player keys to a comma-separated string
    const playerKeysStr = Array.isArray(playerKeys) ? playerKeys.join(',') : playerKeys;
    
    // Fetch news for the specified players
    const response = await fetch(`/api/yahoo?endpoint=players;player_keys=${playerKeysStr}/news`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching player news:', error);
    throw error;
  }
};

// Fetch team roster with player details
export const fetchTeamRosterWithDetails = async (teamKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    // Fetch roster with player details including stats
    const response = await fetch(`/api/yahoo?endpoint=team/${teamKey}/roster/players/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching team roster with details:', error);
    throw error;
  }
};
