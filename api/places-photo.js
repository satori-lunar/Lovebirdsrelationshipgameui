/**
 * Vercel Serverless Function to proxy Google Places Photo API calls
 * This solves CORS issues and keeps the API key secure on the server
 */

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    const { photo_reference, maxwidth = 400 } = req.query;

    // Validate required parameters
    if (!photo_reference) {
      res.status(400).json({ error: 'photo_reference is required' });
      return;
    }

    // Get API key from environment variable (server-side only)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error('Google Places API key not configured');
      res.status(500).json({ error: 'Google Places API key not configured' });
      return;
    }

    // Build Google Places Photo API URL
    const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
    url.searchParams.append('photo_reference', photo_reference);
    url.searchParams.append('maxwidth', maxwidth.toString());
    url.searchParams.append('key', apiKey);

    // Make request to Google Places Photo API
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Google Places Photo API error:', response.status);
      res.status(response.status).json({ 
        error: `Google Places Photo API error: ${response.status}`
      });
      return;
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.status(200).send(Buffer.from(imageBuffer));

  } catch (error) {
    console.error('Error in places photo API proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
