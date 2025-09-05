import axios from 'axios';
import { getAccessToken } from './auth';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: 'https://fantasysports.yahooapis.com/fantasy/v2/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the access token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Fetch user's team roster
export const fetchTeamRoster = async (teamKey) => {
  try {
    const response = await apiClient.get(`team/${teamKey}/roster`);
    return response.data;
  } catch (error) {
    console.error('Error fetching team roster:', error);
    throw error;
  }
};

// Fetch player stats
export const fetchPlayerStats = async (playerKey) => {
  try {
    const response = await apiClient.get(`players;player_keys=${playerKey}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw error;
  }
};

// Fetch league standings
export const fetchLeagueStandings = async (leagueKey) => {
  try {
    const response = await apiClient.get(`league/${leagueKey}/standings`);
    return response.data;
  } catch (error) {
    console.error('Error fetching league standings:', error);
    throw error;
  }
};

// Fetch players with ownership percentage
export const fetchPlayerOwnership = async (leagueKey) => {
  try {
    const response = await apiClient.get(`league/${leagueKey}/players;percent_owned=1`);
    return response.data;
  } catch (error) {
    console.error('Error fetching player ownership:', error);
    throw error;
  }
};

// Export the apiClient for direct usage if needed
export default apiClient;
