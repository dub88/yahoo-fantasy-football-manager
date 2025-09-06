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
  
  // Include required scopes for Yahoo Fantasy Sports API access
  // Using a simple, standard scope that should work
  const scopes = 'fspt-r';
  
  // Build the authorization URL
  const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&language=en-us&scope=${encodeURIComponent(scopes)}`;
  
  console.log('Initiating OAuth with URL:', authUrl);
  
  // Redirect to Yahoo's OAuth page
  window.location.href = authUrl;
};

// Exchange authorization code for access token using serverless function
export const exchangeCodeForToken = async (code) => {
  // Try up to 2 times to exchange the code for a token
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`Attempt ${attempt} to exchange authorization code for token`);
      
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Token exchange failed with status:', response.status);
        console.error('Error details:', responseData);
        
        // Handle specific error cases
        if (response.status === 400) {
          if (responseData.error === 'invalid_grant') {
            throw new Error('The authorization code is invalid or has expired. Please try logging in again.');
          }
        }
        
        throw new Error(responseData.message || 'Failed to exchange authorization code for access token');
      }
      
      console.log('Successfully obtained tokens');
      
      // Store tokens in localStorage
      const expiresAt = Date.now() + (responseData.expires_in * 1000);
      localStorage.setItem('yahoo_access_token', responseData.access_token);
      localStorage.setItem('yahoo_refresh_token', responseData.refresh_token);
      localStorage.setItem('yahoo_token_expires', expiresAt);
      
      return responseData;
      
    } catch (error) {
      console.error(`Error exchanging code for token (attempt ${attempt}):`, error);
      
      // If this is the last attempt, rethrow the error
      if (attempt === 2) {
        throw error;
      }
      
      // Wait a bit before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Refresh access token
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('yahoo_refresh_token');
  
  if (!refreshToken) {
    throw new Error('Missing refresh token.');
  }
  
  try {
    // For refresh token, we still need to make a server-side call
    // We'll create another serverless function for this
    const response = await fetch('/api/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
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
