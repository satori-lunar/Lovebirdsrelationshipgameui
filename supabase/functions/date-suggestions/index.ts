import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DateSuggestionRequest {
  latitude: number
  longitude: number
  radius_km?: number
  preferences: {
    date_types: string[]
    vibe: string[]
    max_budget: number
  }
}

interface PlaceResult {
  id: string
  name: string
  types: string[]
  rating?: number
  price_level?: number
  vicinity: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  photos?: Array<{
    photo_reference: string
  }>
}

interface EventResult {
  id: string
  name: string
  description?: string
  start?: {
    local: string
  }
  venue?: {
    address?: {
      localized_address_display?: string
    }
  }
  ticket_availability?: {
    minimum_ticket_price?: {
      currency: string
      value: number
    }
  }
}

interface DateItem {
  type: 'dining' | 'activity'
  name: string
  place_id?: string
  event_id?: string
  details: any
}

interface DatePackage {
  id: string
  name: string
  budget_category: 'cheap' | 'mid-range' | 'splurge'
  total_cost_estimate: number
  itemized_budget: {
    dining: number
    activity: number
    transportation: number
    taxes_tips: number
  }
  items: DateItem[]
}

// Cache interface for Redis-like functionality
const cache = new Map<string, { data: any; expires: number }>()

function getCacheKey(lat: number, lon: number, radius: number, preferences: any): string {
  return `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${JSON.stringify(preferences)}`
}

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expires) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCachedData(key: string, data: any, ttlMinutes: number = 15): void {
  const expires = Date.now() + (ttlMinutes * 60 * 1000)
  cache.set(key, { data, expires })
}

async function fetchGooglePlaces(lat: number, lon: number, radius: number, apiKey: string): Promise<PlaceResult[]> {
  const types = ['restaurant', 'cafe', 'bar', 'museum', 'park', 'movie_theater', 'shopping_mall', 'bowling_alley']
  const results: PlaceResult[] = []

  for (const type of types) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius * 1000}&type=${type}&key=${apiKey}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.results) {
        results.push(...data.results.slice(0, 5)) // Limit to 5 per type
      }
    } catch (error) {
      console.error(`Error fetching ${type} places:`, error)
    }
  }

  return results
}

async function fetchEventbriteEvents(lat: number, lon: number, apiKey: string): Promise<EventResult[]> {
  try {
    const url = `https://www.eventbriteapi.com/v3/events/search/?location.latitude=${lat}&location.longitude=${lon}&location.within=5km&token=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    return data.events || []
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error)
    return []
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function mergeAndRankPlaces(places: PlaceResult[], events: EventResult[], userLat: number, userLon: number): any[] {
  const rankedPlaces = places.map(place => ({
    ...place,
    distance: calculateDistance(userLat, userLon, place.geometry.location.lat, place.geometry.location.lng),
    score: (place.rating || 0) * 0.7 - place.distance * 0.3 // Simple scoring
  })).sort((a, b) => b.score - a.score)

  const rankedEvents = events.map(event => ({
    ...event,
    distance: 0, // Eventbrite doesn't provide coordinates in this API response
    score: 0.5 // Default score for events
  }))

  return [...rankedPlaces, ...rankedEvents]
}

function generateDatePackages(rankedItems: any[], preferences: any): DatePackage[] {
  const diningOptions = rankedItems.filter(item => item.types?.includes('restaurant') || item.types?.includes('cafe'))
  const activityOptions = rankedItems.filter(item => !item.types?.includes('restaurant') && !item.types?.includes('cafe'))

  const packages: DatePackage[] = []

  // Cheap package
  if (diningOptions.length > 0 && activityOptions.length > 0) {
    const dining = diningOptions[0]
    const activity = activityOptions[0]

    const diningCost = (dining.price_level || 1) * 15 // Estimate $15-45 based on price level
    const activityCost = activity.ticket_availability?.minimum_ticket_price?.value || 10
    const transportCost = Math.min(15, Math.max(5, (dining.distance + activity.distance) * 0.5))
    const taxesTips = (diningCost + activityCost) * 0.15

    packages.push({
      id: 'cheap_package',
      name: 'Budget-Friendly Evening',
      budget_category: 'cheap',
      total_cost_estimate: diningCost + activityCost + transportCost + taxesTips,
      itemized_budget: {
        dining: diningCost,
        activity: activityCost,
        transportation: transportCost,
        taxes_tips: taxesTips
      },
      items: [
        {
          type: 'dining',
          name: dining.name,
          place_id: dining.place_id,
          details: dining
        },
        {
          type: 'activity',
          name: activity.name?.text || activity.name || 'Local Activity',
          event_id: activity.id,
          details: activity
        }
      ]
    })
  }

  // Mid-range package
  if (diningOptions.length > 1 && activityOptions.length > 1) {
    const dining = diningOptions[1]
    const activity = activityOptions[1]

    const diningCost = (dining.price_level || 2) * 20
    const activityCost = activity.ticket_availability?.minimum_ticket_price?.value || 25
    const transportCost = Math.min(20, Math.max(8, (dining.distance + activity.distance) * 0.7))
    const taxesTips = (diningCost + activityCost) * 0.18

    packages.push({
      id: 'midrange_package',
      name: 'Perfect Evening Out',
      budget_category: 'mid-range',
      total_cost_estimate: diningCost + activityCost + transportCost + taxesTips,
      itemized_budget: {
        dining: diningCost,
        activity: activityCost,
        transportation: transportCost,
        taxes_tips: taxesTips
      },
      items: [
        {
          type: 'dining',
          name: dining.name,
          place_id: dining.place_id,
          details: dining
        },
        {
          type: 'activity',
          name: activity.name?.text || activity.name || 'Local Activity',
          event_id: activity.id,
          details: activity
        }
      ]
    })
  }

  // Splurge package
  if (diningOptions.length > 2 && activityOptions.length > 2) {
    const dining = diningOptions[2]
    const activity = activityOptions[2]

    const diningCost = (dining.price_level || 3) * 30
    const activityCost = activity.ticket_availability?.minimum_ticket_price?.value || 50
    const transportCost = Math.min(30, Math.max(12, (dining.distance + activity.distance) * 1.0))
    const taxesTips = (diningCost + activityCost) * 0.2

    packages.push({
      id: 'splurge_package',
      name: 'Luxury Experience',
      budget_category: 'splurge',
      total_cost_estimate: diningCost + activityCost + transportCost + taxesTips,
      itemized_budget: {
        dining: diningCost,
        activity: activityCost,
        transportation: transportCost,
        taxes_tips: taxesTips
      },
      items: [
        {
          type: 'dining',
          name: dining.name,
          place_id: dining.place_id,
          details: dining
        },
        {
          type: 'activity',
          name: activity.name?.text || activity.name || 'Premium Activity',
          event_id: activity.id,
          details: activity
        }
      ]
    })
  }

  return packages.filter(pkg => pkg.total_cost_estimate <= (preferences.max_budget || 100) * 2) // Allow some flexibility
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const requestData: DateSuggestionRequest = await req.json()
    const { latitude, longitude, radius_km = 5, preferences } = requestData

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check cache first
    const cacheKey = getCacheKey(latitude, longitude, radius_km, preferences)
    const cachedResult = getCachedData(cacheKey)
    if (cachedResult) {
      return new Response(
        JSON.stringify(cachedResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get API keys from environment
    const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    const eventbriteApiKey = Deno.env.get('EVENTBRITE_API_KEY')

    if (!googlePlacesApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch data from APIs in parallel
    const [places, events] = await Promise.all([
      fetchGooglePlaces(latitude, longitude, radius_km, googlePlacesApiKey),
      eventbriteApiKey ? fetchEventbriteEvents(latitude, longitude, eventbriteApiKey) : Promise.resolve([])
    ])

    // Merge and rank results
    const rankedItems = mergeAndRankPlaces(places, events, latitude, longitude)

    // Generate date packages
    const datePackages = generateDatePackages(rankedItems, preferences)

    const result = { date_packages: datePackages }

    // Cache the result
    setCachedData(cacheKey, result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in date-suggestions function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
