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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (errorData.code_expired) {
          if (attempt < 2) {
            // If this is the first attempt and the code expired, wait a bit and retry
            console.log('Authorization code expired, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else {
            throw new Error('The authorization code has expired. Please try logging in again.');
          }
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store access token and refresh token in localStorage
      localStorage.setItem('yahoo_access_token', data.access_token);
      localStorage.setItem('yahoo_refresh_token', data.refresh_token);
      localStorage.setItem('yahoo_token_expires', Date.now() + (data.expires_in * 1000));
      
      return data;
    } catch (error) {
      console.error(`Error exchanging code for token (attempt ${attempt}):`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === 2) {
        throw error;
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
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
