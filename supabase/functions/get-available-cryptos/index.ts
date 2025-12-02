// Edge Function: get-available-cryptos
// Fetches all available cryptocurrencies from NowPayments API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createNowPaymentsClient } from '../_shared/nowpayments-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔄 Fetching available cryptocurrencies from NowPayments...');

    // Initialize NowPayments client
    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!nowpaymentsApiKey) {
      throw new Error('NOWPAYMENTS_API_KEY not configured');
    }

    const nowpayments = createNowPaymentsClient({
      apiKey: nowpaymentsApiKey,
    });

    // Get available currencies
    const result = await nowpayments.getAvailableCurrencies();

    console.log(`✅ Found ${result.currencies.length} available cryptocurrencies`);

    // Map to frontend format with network info
    const cryptos = result.currencies.map((ticker: string) => {
      // Determine networks based on ticker
      let networks = [ticker];
      
      // Special handling for multi-network currencies
      if (ticker.includes('usdt')) {
        networks = ['trc20', 'erc20', 'bep20'];
      } else if (ticker.includes('usdc')) {
        networks = ['trc20', 'erc20', 'bep20'];
      }
      
      return {
        ticker: ticker.toLowerCase(),
        name: ticker.toUpperCase(),
        networks: networks,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: cryptos.length,
        cryptocurrencies: cryptos,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error fetching available cryptos:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to fetch cryptocurrencies',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
