// Utility functions for Yahoo OAuth 2.0 authentication

// Initiate OAuth flow by redirecting to Yahoo's authorization URL
export const initiateOAuth = () => {
  const clientId = import.meta.env.VITE_YAHOO_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_YAHOO_REDIRECT_URI;
  const responseType = 'code';
  
  if (!clientId || !redirectUri) {
    console.error('Missing OAuth configuration. Please check your environment variables.');
    return;
  }
  
  const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&language=en-us`;
  
  // Redirect to Yahoo's OAuth page
  window.location.href = authUrl;
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code) => {
  const clientId = import.meta.env.VITE_YAHOO_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_YAHOO_CLIENT_SECRET;
  const redirectUri = import.meta.env.VITE_YAHOO_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth configuration. Please check your environment variables.');
  }
  
  try {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Store access token and refresh token in localStorage
    localStorage.setItem('yahoo_access_token', data.access_token);
    localStorage.setItem('yahoo_refresh_token', data.refresh_token);
    localStorage.setItem('yahoo_token_expires', Date.now() + (data.expires_in * 1000));
    
    return data;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

// Refresh access token
export const refreshAccessToken = async () => {
  const clientId = import.meta.env.VITE_YAHOO_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_YAHOO_CLIENT_SECRET;
  const refreshToken = localStorage.getItem('yahoo_refresh_token');
  
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth configuration or refresh token.');
  }
  
  try {
    const response = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update access token in localStorage
    localStorage.setItem('yahoo_access_token', data.access_token);
    localStorage.setItem('yahoo_token_expires', Date.now() + (data.expires_in * 1000));
    
    return data;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

// Get access token, refreshing if necessary
export const getAccessToken = async () => {
  const accessToken = localStorage.getItem('yahoo_access_token');
  const expiresAt = localStorage.getItem('yahoo_token_expires');
  
  if (!accessToken || !expiresAt) {
    return null;
  }
  
  // Check if token is expired or will expire in the next minute
  if (Date.now() >= (parseInt(expiresAt) - 60000)) {
    try {
      await refreshAccessToken();
      return localStorage.getItem('yahoo_access_token');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }
  
  return accessToken;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const accessToken = localStorage.getItem('yahoo_access_token');
  const expiresAt = localStorage.getItem('yahoo_token_expires');
  
  if (!accessToken || !expiresAt) {
    return false;
  }
  
  // Check if token is expired
  return Date.now() < parseInt(expiresAt);
};

// Logout function
export const logout = () => {
  localStorage.removeItem('yahoo_access_token');
  localStorage.removeItem('yahoo_refresh_token');
  localStorage.removeItem('yahoo_token_expires');
};
