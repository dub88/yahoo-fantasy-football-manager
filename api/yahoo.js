// Vercel serverless function to proxy Yahoo API requests
export default async function handler(request, response) {
  // Log incoming request for debugging
  console.log('Yahoo API proxy request received:', {
    method: request.method,
    query: request.query,
    headers: {
      authorization: request.headers.authorization ? 'PRESENT' : 'MISSING',
      'content-type': request.headers['content-type']
    }
  });
  
  // Only allow GET requests
  if (request.method !== 'GET') {
    console.log('Method not allowed:', request.method);
    return response.status(405).json({ error: 'Method not allowed' });
  }
  
  const { endpoint } = request.query;
  
  if (!endpoint) {
    console.log('Endpoint is required');
    return response.status(400).json({ error: 'Endpoint is required' });
  }
  
  try {
    // Get access token from authorization header
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');
    
    console.log('Access token check:', {
      hasAuthHeader: !!authHeader,
      hasAccessToken: !!accessToken
    });
    
    if (!accessToken) {
      console.log('No access token provided');
      return response.status(401).json({ error: 'Access token is required' });
    }
    
    // Log the request we're about to make
    const yahooUrl = `https://fantasysports.yahooapis.com/fantasy/v2/${endpoint}`;
    console.log('Making request to Yahoo API:', {
      url: yahooUrl,
      endpoint: endpoint
    });
    
    // Make request to Yahoo API
    const yahooResponse = await fetch(yahooUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Yahoo API response:', {
      status: yahooResponse.status,
      statusText: yahooResponse.statusText
    });
    
    if (!yahooResponse.ok) {
      const errorText = await yahooResponse.text();
      console.error('Yahoo API request failed:', {
        status: yahooResponse.status,
        statusText: yahooResponse.statusText,
        errorText: errorText
      });
      return response.status(yahooResponse.status).json({ 
        error: 'Failed to fetch from Yahoo API',
        status: yahooResponse.status,
        details: errorText 
      });
    }
    
    // Yahoo API returns XML, so we need to handle that
    const contentType = yahooResponse.headers.get('content-type');
    let data;
    
    console.log('Yahoo API content type:', contentType);
    
    if (contentType && contentType.includes('application/xml')) {
      data = await yahooResponse.text();
    } else {
      data = await yahooResponse.json();
    }
    
    console.log('Yahoo API response data length:', typeof data === 'string' ? data.length : 'JSON');
    
    // Return the data to the client
    return response.status(200).json({
      data,
      contentType
    });
  } catch (error) {
    console.error('Error in Yahoo API proxy:', error);
    return response.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
