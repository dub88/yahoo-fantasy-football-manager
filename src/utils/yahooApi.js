import { getAccessToken } from './auth';

// Fetch user's team roster through proxy
export const fetchTeamRoster = async (teamKey) => {
  try {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    
    const response = await fetch(`/api/yahoo?endpoint=team/${teamKey}/roster`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
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
      throw new Error(`HTTP error! status: ${response.status}`);
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching player ownership:', error);
    throw error;
  }
};
