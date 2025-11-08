// Edge Function: update-crypto-rates
// Updates crypto exchange rates from CoinGecko API
// Can be called manually or via cron job

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoinGeckoResponse {
  bitcoin?: { ngn: number };
  tether?: { ngn: number };
  'usd-coin'?: { ngn: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Fetching live crypto rates from CoinGecko...');

    // Fetch rates from CoinGecko (Free API, no key needed)
    const coingeckoUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether,usd-coin&vs_currencies=ngn';
    
    const response = await fetch(coingeckoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API failed: ${response.status} ${response.statusText}`);
    }

    const data: CoinGeckoResponse = await response.json();

    console.log('✅ Received rates:', data);

    // Extract rates
    const btcRate = data.bitcoin?.ngn;
    const usdtRate = data.tether?.ngn;
    const usdcRate = data['usd-coin']?.ngn;

    if (!btcRate || !usdtRate || !usdcRate) {
      throw new Error('Missing rates in API response');
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update rates in database
    const updates = [
      { crypto_type: 'BTC', market_rate: btcRate },
      { crypto_type: 'USDT', market_rate: usdtRate },
      { crypto_type: 'USDC', market_rate: usdcRate },
    ];

    const results = [];

    for (const update of updates) {
      const { data: updated, error } = await supabaseAdmin
        .from('crypto_exchange_rates')
        .update({
          market_rate: update.market_rate,
          last_updated: new Date().toISOString(),
        })
        .eq('crypto_type', update.crypto_type)
        .select()
        .single();

      if (error) {
        console.error(`Failed to update ${update.crypto_type}:`, error);
        results.push({ crypto_type: update.crypto_type, success: false, error: error.message });
      } else {
        console.log(`✅ Updated ${update.crypto_type}: ₦${update.market_rate.toLocaleString()}`);
        results.push({ 
          crypto_type: update.crypto_type, 
          success: true, 
          rate: update.market_rate,
          use_manual: updated.use_manual,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exchange rates updated successfully',
        rates: {
          BTC: btcRate,
          USDT: usdtRate,
          USDC: usdcRate,
        },
        timestamp: new Date().toISOString(),
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error updating rates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
