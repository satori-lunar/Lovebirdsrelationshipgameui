/**
 * Vercel Serverless Function to proxy Google Places API Place Details calls
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
    const { place_id } = req.query;

    // Validate required parameters
    if (!place_id) {
      res.status(400).json({ error: 'place_id is required' });
      return;
    }

    // Get API key from environment variable (server-side only)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error('Google Places API key not configured');
      res.status(500).json({ error: 'Google Places API key not configured' });
      return;
    }

    // Build Google Places API URL for Place Details
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.append('place_id', place_id);
    url.searchParams.append('fields', 'formatted_phone_number,international_phone_number,website,opening_hours,url,rating,user_ratings_total');
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
    if (data.status !== 'OK') {
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
    console.error('Error in places-details API proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
