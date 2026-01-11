import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateSavedDateRequest {
  name: string
  date_package: any
  latitude: number
  longitude: number
}

interface UpdateSavedDateRequest {
  name?: string
  date_package?: any
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const dateId = pathParts[pathParts.length - 1]

    switch (req.method) {
      case 'GET':
        if (dateId && dateId !== 'saved-dates') {
          // Get specific saved date
          const { data, error } = await supabaseClient
            .from('saved_date_plans')
            .select('*')
            .eq('id', dateId)
            .eq('user_id', user.id)
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Saved date not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ saved_date: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all saved dates for user
          const { data, error } = await supabaseClient
            .from('saved_date_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Error fetching saved dates:', error)
            return new Response(
              JSON.stringify({ error: 'Failed to fetch saved dates' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ saved_dates: data || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'POST':
        const createData: CreateSavedDateRequest = await req.json()
        const { name, date_package, latitude, longitude } = createData

        if (!name || !date_package || latitude === undefined || longitude === undefined) {
          return new Response(
            JSON.stringify({ error: 'Name, date_package, latitude, and longitude are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: created, error: createError } = await supabaseClient
          .from('saved_date_plans')
          .insert({
            user_id: user.id,
            name,
            location_lat: latitude,
            location_lon: longitude,
            date_package_json: date_package,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating saved date:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to save date plan' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            message: 'Date plan saved successfully',
            saved_date_id: created.id
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'PUT':
        if (!dateId || dateId === 'saved-dates') {
          return new Response(
            JSON.stringify({ error: 'Date ID required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const updateData: UpdateSavedDateRequest = await req.json()

        // Build update object
        const updates: any = {
          updated_at: new Date().toISOString()
        }

        if (updateData.name) updates.name = updateData.name
        if (updateData.date_package) updates.date_package_json = updateData.date_package

        const { data: updated, error: updateError } = await supabaseClient
          .from('saved_date_plans')
          .update(updates)
          .eq('id', dateId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating saved date:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to update date plan' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ message: 'Date plan updated successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'DELETE':
        if (!dateId || dateId === 'saved-dates') {
          return new Response(
            JSON.stringify({ error: 'Date ID required for deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: deleteError } = await supabaseClient
          .from('saved_date_plans')
          .delete()
          .eq('id', dateId)
          .eq('user_id', user.id)

        if (deleteError) {
          console.error('Error deleting saved date:', deleteError)
          return new Response(
            JSON.stringify({ error: 'Failed to delete date plan' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ message: 'Date plan deleted successfully' }),
          { status: 204, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in saved-dates function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
