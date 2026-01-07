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
  user_id?: string // Optional: for calendar integration
  couple_id?: string // Optional: for partner calendar checking
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
  suggested_times?: Date[] // Calendar-aware time suggestions
}

// Cache interface for Redis-like functionality
const cache = new Map<string, { data: any; expires: number }>()

// Calendar availability interface
interface CalendarEvent {
  id: string
  user_id: string
  start_time: string
  end_time: string
  can_share_busy_status: boolean
}

interface NotificationPreferences {
  date_suggestion_days: string[]
  date_suggestion_time_preference: string
}

function getCacheKey(lat: number, lon: number, radius: number, preferences: any, userId?: string): string {
  return `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${JSON.stringify(preferences)}_${userId || 'anon'}`
}

// Calendar availability functions
async function getPartnerCalendarEvents(supabase: any, coupleId: string, userId: string): Promise<CalendarEvent[]> {
  // Get partner ID
  const { data: couple } = await supabase
    .from('relationships')
    .select('partner_a_id, partner_b_id')
    .eq('id', coupleId)
    .single()

  if (!couple) return []

  const partnerId = couple.partner_a_id === userId ? couple.partner_b_id : couple.partner_a_id

  // Get partner's calendar events where they share busy status
  const { data: events } = await supabase
    .from('user_calendar_events')
    .select('id, user_id, start_time, end_time, can_share_busy_status')
    .eq('user_id', partnerId)
    .eq('can_share_busy_status', true)

  return events || []
}

async function getUserNotificationPreferences(supabase: any, userId: string): Promise<NotificationPreferences | null> {
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('date_suggestion_days, date_suggestion_time_preference')
    .eq('user_id', userId)
    .single()

  return data
}

function isTimeSlotAvailable(events: CalendarEvent[], proposedDateTime: Date, durationHours: number = 3): boolean {
  const proposedEnd = new Date(proposedDateTime)
  proposedEnd.setHours(proposedEnd.getHours() + durationHours)

  // Check if any events overlap with the proposed time slot
  return !events.some(event => {
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)

    // Check for overlap: proposed time overlaps with existing event
    return (proposedDateTime < eventEnd && proposedEnd > eventStart)
  })
}

function getPreferredTimeSlots(preferences: NotificationPreferences | null, date: Date): Date[] {
  const slots: Date[] = []
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

  // Check if this day is preferred
  if (preferences?.date_suggestion_days && !preferences.date_suggestion_days.includes(dayName)) {
    return slots // No slots for non-preferred days
  }

  // Determine preferred hour based on time preference
  let preferredHour = 19 // Default evening
  if (preferences?.date_suggestion_time_preference === 'morning') {
    preferredHour = 10
  } else if (preferences?.date_suggestion_time_preference === 'afternoon') {
    preferredHour = 14
  }

  // Create time slots around preferred time
  const preferredTime = new Date(date)
  preferredTime.setHours(preferredHour, 0, 0, 0)
  slots.push(preferredTime)

  // Add alternative slots (1-2 hours before/after)
  for (let offset of [-2, -1, 1, 2]) {
    const alternativeTime = new Date(preferredTime)
    alternativeTime.setHours(alternativeTime.getHours() + offset)
    if (alternativeTime.getHours() >= 9 && alternativeTime.getHours() <= 22) { // Reasonable hours
      slots.push(alternativeTime)
    }
  }

  return slots
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

function generateDatePackages(
  rankedItems: any[],
  preferences: any,
  partnerCalendarEvents: CalendarEvent[] = [],
  userPreferences: NotificationPreferences | null = null
): DatePackage[] {
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

    // Generate calendar-aware time suggestions for the next 7 days
    const timeSuggestions: Date[] = []
    if (partnerCalendarEvents.length > 0 || userPreferences) {
      const now = new Date()
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(now)
        checkDate.setDate(now.getDate() + dayOffset)

        const availableSlots = getPreferredTimeSlots(userPreferences, checkDate)
        for (const slot of availableSlots) {
          if (isTimeSlotAvailable(partnerCalendarEvents, slot)) {
            timeSuggestions.push(slot)
            if (timeSuggestions.length >= 5) break // Limit suggestions
          }
        }
        if (timeSuggestions.length >= 5) break
      }
    }

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
      ],
      suggested_times: timeSuggestions.length > 0 ? timeSuggestions : undefined
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

    // Generate calendar-aware time suggestions
    const timeSuggestions: Date[] = []
    if (partnerCalendarEvents.length > 0 || userPreferences) {
      const now = new Date()
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(now)
        checkDate.setDate(now.getDate() + dayOffset)

        const availableSlots = getPreferredTimeSlots(userPreferences, checkDate)
        for (const slot of availableSlots) {
          if (isTimeSlotAvailable(partnerCalendarEvents, slot)) {
            timeSuggestions.push(slot)
            if (timeSuggestions.length >= 5) break
          }
        }
        if (timeSuggestions.length >= 5) break
      }
    }

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
      ],
      suggested_times: timeSuggestions.length > 0 ? timeSuggestions : undefined
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

    // Generate calendar-aware time suggestions
    const timeSuggestions: Date[] = []
    if (partnerCalendarEvents.length > 0 || userPreferences) {
      const now = new Date()
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(now)
        checkDate.setDate(now.getDate() + dayOffset)

        const availableSlots = getPreferredTimeSlots(userPreferences, checkDate)
        for (const slot of availableSlots) {
          if (isTimeSlotAvailable(partnerCalendarEvents, slot)) {
            timeSuggestions.push(slot)
            if (timeSuggestions.length >= 5) break
          }
        }
        if (timeSuggestions.length >= 5) break
      }
    }

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
      ],
      suggested_times: timeSuggestions.length > 0 ? timeSuggestions : undefined
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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Parse request body
    const requestData: DateSuggestionRequest = await req.json()
    const { latitude, longitude, radius_km = 5, preferences, user_id, couple_id } = requestData

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check cache first (include user_id for personalized caching)
    const cacheKey = getCacheKey(latitude, longitude, radius_km, preferences, user_id)
    const cachedResult = getCachedData(cacheKey)
    if (cachedResult) {
      return new Response(
        JSON.stringify(cachedResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get calendar data and preferences if user is provided
    let partnerCalendarEvents: CalendarEvent[] = []
    let userPreferences: NotificationPreferences | null = null

    if (user_id && couple_id) {
      [partnerCalendarEvents, userPreferences] = await Promise.all([
        getPartnerCalendarEvents(supabase, couple_id, user_id),
        getUserNotificationPreferences(supabase, user_id)
      ])
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

    // Generate date packages with calendar awareness
    const datePackages = generateDatePackages(rankedItems, preferences, partnerCalendarEvents, userPreferences)

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
