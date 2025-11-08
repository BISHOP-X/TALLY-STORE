// Supabase Edge Function: Create Crypto Sell Order
// Generates a Bitnob deposit address for the user to send crypto to

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { BitnobClient } from "../_shared/bitnob-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
  cryptoType: 'BTC' | 'USDT' | 'USDC';
  cryptoAmount: number;
  chain?: 'tron' | 'ethereum' | 'polygon' | 'bsc' | 'btc';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateOrderRequest = await req.json();
    const { cryptoType, cryptoAmount, chain } = body;

    // Validate input
    if (!cryptoType || !cryptoAmount || cryptoAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: cryptoType and cryptoAmount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get exchange rate
    const { data: rateData, error: rateError } = await supabaseClient
      .from('crypto_exchange_rates')
      .select('*')
      .eq('crypto_type', cryptoType)
      .single();

    if (rateError || !rateData) {
      return new Response(
        JSON.stringify({ error: 'Exchange rate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate naira amount (with markup)
    const rate = rateData.use_manual ? rateData.manual_rate : rateData.market_rate;
    const nairaAmount = cryptoAmount * rate;

    // Check daily limit (₦1M)
    const today = new Date().toISOString().split('T')[0];
    const { data: limitData } = await supabaseClient
      .from('user_daily_limits')
      .select('total_sold_today')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const currentTotal = limitData?.total_sold_today || 0;
    if (currentTotal + nairaAmount > 1000000) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily limit exceeded',
          limit: 1000000,
          used: currentTotal,
          remaining: 1000000 - currentTotal,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Bitnob client
    const bitnob = new BitnobClient({
      secretKey: Deno.env.get('BITNOB_SECRET_KEY') ?? '',
      hmacKey: Deno.env.get('BITNOB_HMAC_KEY') ?? '',
      webhookSecret: Deno.env.get('BITNOB_WEBHOOK_SECRET') ?? '',
    });

    // Generate deposit address from Bitnob
    const addressResult = await bitnob.generateAddress({
      cryptoType,
      chain: chain || (cryptoType === 'BTC' ? 'btc' : 'tron'),
      customerEmail: profile.email,
    });

    if (!addressResult.success || !addressResult.address) {
      return new Response(
        JSON.stringify({ error: addressResult.error || 'Failed to generate address' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record in database
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const { data: transaction, error: txError } = await supabaseClient
      .from('crypto_transactions')
      .insert({
        user_id: user.id,
        crypto_type: cryptoType,
        crypto_amount: cryptoAmount,
        naira_amount: nairaAmount,
        exchange_rate: rate,
        deposit_address: addressResult.address,
        bitnob_reference: addressResult.reference,
        chain: chain || (cryptoType === 'BTC' ? 'btc' : 'tron'),
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          cryptoType,
          cryptoAmount,
          nairaAmount,
          exchangeRate: rate,
          depositAddress: addressResult.address,
          expiresAt: expiresAt.toISOString(),
          chain: chain || (cryptoType === 'BTC' ? 'btc' : 'tron'),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-crypto-sell-order:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
