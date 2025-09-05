// Vercel serverless function to handle Yahoo OAuth token exchange
export default async function handler(request, response) {
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
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing environment variables');
      return response.status(500).json({ error: 'Server configuration error' });
    }
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return response.status(tokenResponse.status).json({ error: 'Failed to exchange token' });
    }
    
    const tokenData = await tokenResponse.json();
    
    // Return the token data to the client
    return response.status(200).json(tokenData);
  } catch (error) {
    console.error('Error in token exchange:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
