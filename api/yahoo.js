// Vercel serverless function to proxy Yahoo API requests
export default async function handler(request, response) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }
  
  const { endpoint } = request.query;
  
  if (!endpoint) {
    return response.status(400).json({ error: 'Endpoint is required' });
  }
  
  try {
    // Get access token from localStorage (passed as header)
    const accessToken = request.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return response.status(401).json({ error: 'Access token is required' });
    }
    
    // Make request to Yahoo API
    const yahooResponse = await fetch(`https://fantasysports.yahooapis.com/fantasy/v2/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text();
      console.error('Yahoo API request failed:', errorText);
      return response.status(yahooResponse.status).json({ error: 'Failed to fetch from Yahoo API' });
    }
    
    // Yahoo API returns XML, so we need to handle that
    const contentType = yahooResponse.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/xml')) {
      data = await yahooResponse.text();
    } else {
      data = await yahooResponse.json();
    }
    
    // Return the data to the client
    return response.status(200).json({
      data,
      contentType
    });
  } catch (error) {
    console.error('Error in Yahoo API proxy:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}
