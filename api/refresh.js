// Vercel serverless function to handle Yahoo OAuth token refresh
export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }
  
  const { refresh_token } = request.body;
  
  if (!refresh_token) {
    return response.status(400).json({ error: 'Refresh token is required' });
  }
  
  try {
    // Get environment variables
    const clientId = process.env.YAHOO_CLIENT_ID;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET;
    
    // Debug logging
    console.log('Refresh environment variables check:');
    console.log('YAHOO_CLIENT_ID exists:', !!clientId);
    console.log('YAHOO_CLIENT_SECRET exists:', !!clientSecret);
    
    if (!clientId || !clientSecret) {
      console.error('Missing environment variables for refresh');
      console.error('YAHOO_CLIENT_ID:', clientId ? 'SET' : 'MISSING');
      console.error('YAHOO_CLIENT_SECRET:', clientSecret ? 'SET' : 'MISSING');
      return response.status(500).json({ error: 'Server configuration error' });
    }
    
    // Refresh access token
    const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed with status:', tokenResponse.status);
      console.error('Token refresh error response:', errorText);
      return response.status(tokenResponse.status).json({ error: 'Failed to refresh token', details: errorText });
    }
    
    const tokenData = await tokenResponse.json();
    
    // Return the token data to the client
    return response.status(200).json(tokenData);
  } catch (error) {
    console.error('Error in token refresh:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
