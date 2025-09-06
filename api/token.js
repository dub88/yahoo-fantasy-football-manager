// Vercel serverless function to handle Yahoo OAuth token exchange
export default async function handler(request, response) {
  // Add CORS headers for all requests
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }
  
  const { code } = request.body;
  
  if (!code) {
    return response.status(400).json({ error: 'Authorization code is required' });
  }
  
  try {
    // Get environment variables
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    const redirectUri = process.env.YAHOO_REDIRECT_URI;
    
    // Debug logging (be careful not to log sensitive information in production)
    console.log('Environment variables check:');
    console.log('YAHOO_CLIENT_ID exists:', !!clientId);
    console.log('YAHOO_REDIRECT_URI exists:', !!redirectUri);
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing required environment variables');
      return response.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing required OAuth configuration. Please check your environment variables.'
      });
    }
    
    console.log('Exchanging authorization code for access token...');
    
    // Exchange authorization code for access token
    const tokenUrl = 'https://api.login.yahoo.com/oauth2/get_token';
    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('redirect_uri', redirectUri);
    tokenParams.append('code', code);
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader,
        'User-Agent': 'YahooFantasyManager/1.0',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });
    
    const responseData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed with status:', tokenResponse.status);
      console.error('Error details:', responseData);
      
      // Handle specific error cases
      if (tokenResponse.status === 400) {
        if (responseData.error === 'invalid_grant') {
          return response.status(400).json({ 
            error: 'invalid_grant',
            message: 'The authorization code is invalid or has expired',
            details: responseData
          });
        }
      }
      
      return response.status(tokenResponse.status).json({
        error: responseData.error || 'token_exchange_failed',
        message: 'Failed to exchange authorization code for access token',
        details: responseData
      });
    }
    
    // Successfully obtained tokens
    console.log('Successfully obtained tokens');
    
    // Return the token data to the client
    return response.status(200).json({
      access_token: responseData.access_token,
      refresh_token: responseData.refresh_token,
      expires_in: responseData.expires_in,
      token_type: responseData.token_type
    });
    
  } catch (error) {
    console.error('Error in token exchange:', error);
    return response.status(500).json({ 
      error: 'internal_server_error',
      message: 'An unexpected error occurred during token exchange',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
