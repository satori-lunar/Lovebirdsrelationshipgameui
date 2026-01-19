/**
 * Vercel Serverless Function to proxy Google Places API calls
 * This solves CORS issues and keeps the API key secure on the server
 */

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { latitude, longitude, radius, type } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    // Get API key from environment variable (server-side only)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error('Google Places API key not configured');
      res.status(500).json({ error: 'Google Places API key not configured' });
      return;
    }

    // Build Google Places API URL
    const radiusMeters = radius ? Math.min(parseFloat(radius) * 1609.34, 50000) : 20000;
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${latitude},${longitude}`);
    url.searchParams.append('radius', radiusMeters.toString());
    if (type && type !== 'all') {
      url.searchParams.append('type', type);
    }
    url.searchParams.append('key', apiKey);

    // Make request to Google Places API
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', response.status, errorText);
      res.status(response.status).json({ 
        error: `Google Places API error: ${response.status}`,
        details: errorText
      });
      return;
    }

    const data = await response.json();

    // Check for API errors
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API returned error:', data.status, data.error_message);
      res.status(400).json({ 
        error: `Google Places API error: ${data.status}`,
        message: data.error_message || 'Unknown error'
      });
      return;
    }

    // Return successful response
    res.status(200).json(data);

  } catch (error) {
    console.error('Error in places API proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
