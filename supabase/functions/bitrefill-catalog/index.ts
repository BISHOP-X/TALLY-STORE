import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createBitrefillClient } from "../_shared/bitrefill-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// action: 'list' | 'search' | 'details'
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify authentication (catalog browsing still requires a logged-in user,
    // per repo convention, so the Bitrefill API key never reaches the browser)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, query, product_id, category, limit, cursor } = await req.json();

    if (!action) {
      throw new Error('action is required (list, search, or details)');
    }

    const bitrefill = createBitrefillClient({
      apiKey: Deno.env.get('BITREFILL_API_KEY') ?? '',
    });

    let result;

    switch (action) {
      case 'list': {
        result = await bitrefill.listProducts(limit || 50, cursor);
        break;
      }
      case 'search': {
        if (!query) throw new Error('query is required for search');
        // category is supported as part of the query string convention Bitrefill
        // uses for filtering (e.g. "gift card" vs "esim"); kept simple here.
        const q = category ? `${query} ${category}` : query;
        result = await bitrefill.searchProducts(q, limit || 50);
        break;
      }
      case 'details': {
        if (!product_id) throw new Error('product_id is required for details');
        result = await bitrefill.getProductDetails(product_id);
        break;
      }
      default:
        throw new Error('Invalid action. Must be one of: list, search, details');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in bitrefill-catalog:', error);

    console.error('Detailed error:', JSON.stringify({
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name,
    }));

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Failed to fetch Bitrefill catalog',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
