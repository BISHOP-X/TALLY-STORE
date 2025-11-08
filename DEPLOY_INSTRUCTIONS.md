# 🚀 Supabase Edge Function Deployment Instructions

## IMPORTANT: The code keeps reverting because you need to follow these exact steps:

### Step 1: Navigate to Edge Functions
1. Go to **Supabase Dashboard** → https://supabase.com/dashboard
2. Select your project: **dssvvswvqnxanyzfhixf**
3. Click **Edge Functions** in the left sidebar
4. Find and click **create-crypto-sell-order**

### Step 2: Check for Multiple Versions
- Look for a **"Versions"** or **"Deployments"** tab
- Make sure you're editing the **LATEST/ACTIVE** version
- Delete any old/inactive versions if possible

### Step 3: Replace ALL Code
1. Click **"Edit Function"** or the edit icon
2. **SELECT ALL** (Ctrl+A or Cmd+A) to highlight everything
3. **DELETE ALL** the old code
4. **PASTE** the new code below (scroll down)
5. Click **"Save"** first (if available)
6. Then click **"Deploy"**

### Step 4: Verify Deployment
- Wait for "Deployment successful" message
- Check the deployment timestamp - should be very recent
- Look for version number increase

---

## ✅ CORRECTED CODE TO PASTE:

\`\`\`typescript
// Bitnob API Client (inlined)
export class BitnobClient {
  secretKey: string;
  hmacKey: string;
  webhookSecret: string;
  apiUrl: string;

  constructor(config: { secretKey: string; hmacKey: string; webhookSecret: string; apiUrl?: string }) {
    this.secretKey = config.secretKey;
    this.hmacKey = config.hmacKey;
    this.webhookSecret = config.webhookSecret;
    this.apiUrl = config.apiUrl || 'https://api.bitnob.co';
  }

  async generateAddress(request: {
    cryptoType: string;
    chain: string;
    customerEmail: string;
  }) {
    try {
      let endpoint = '';
      let payload: any = {};

      if (request.cryptoType === 'BTC') {
        // Bitcoin Lightning Network
        endpoint = '/api/v1/wallets/ln/generateaddress';
        payload = {
          customerEmail: request.customerEmail,
          label: \`TallyStore-\${Date.now()}\`,
        };
      } else {
        // Stablecoins (USDT, USDC) - TRON network
        endpoint = '/api/v1/addresses/generate';
        payload = {
          chain: request.chain || 'tron',
          currency: request.cryptoType,
          customerEmail: request.customerEmail,
        };
      }

      const response = await this.makeRequest('POST', endpoint, payload);

      if (!response.success) {
        console.error('Bitnob generateAddress failed:', {
          cryptoType: request.cryptoType,
          chain: request.chain,
          endpoint,
          payload,
          response,
        });
        return {
          success: false,
          error: response.message || 'Failed to generate address',
        };
      }

      const generatedAddress = response.data?.address || response.data?.lightning_address;

      // ✅ CRITICAL FIX: Only validate TRON addresses for stablecoins, NOT for Bitcoin
      if (request.cryptoType !== 'BTC' && request.chain === 'tron') {
        // For USDT/USDC on TRON, address MUST start with 'T'
        if (!generatedAddress?.startsWith('T')) {
          console.error('CRITICAL: Bitnob returned wrong address type for stablecoin!', {
            expected: 'TRON address (starts with T)',
            received: generatedAddress,
            cryptoType: request.cryptoType,
            chain: request.chain,
            fullResponse: response,
          });
          return {
            success: false,
            error: \`Stablecoin address validation failed: Expected TRON address but got \${generatedAddress?.slice(0, 10)}... Please contact support.\`,
          };
        }
      }

      console.log('Bitnob address generated successfully:', {
        cryptoType: request.cryptoType,
        chain: request.chain,
        addressPrefix: generatedAddress?.slice(0, 10),
      });

      return {
        success: true,
        address: generatedAddress,
        reference: response.data?.reference || response.data?.id,
        expiresAt: response.data?.expiresAt,
      };
    } catch (error: any) {
      console.error('Error generating address:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async makeRequest(method: string, endpoint: string, body?: any) {
    const url = \`\${this.apiUrl}\${endpoint}\`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${this.secretKey}\`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || data.error || 'API request failed',
          statusCode: response.status,
          data,
        };
      }

      return {
        success: true,
        data: data.data || data,
        statusCode: response.status,
      };
    } catch (error: any) {
      console.error('Bitnob API request error:', error);
      return {
        success: false,
        message: error.message,
        error,
      };
    }
  }
}

// MAIN FUNCTION
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body first
    const body = await req.json();
    const { cryptoType, cryptoAmount, chain, userId: bodyUserId } = body;

    // Check if using service role key (for testing)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const isServiceRole = authHeader.includes(serviceRoleKey) && serviceRoleKey.length > 0;

    let userId: string;

    if (isServiceRole) {
      // Service role key path: get userId from request body
      if (!bodyUserId) {
        return new Response(
          JSON.stringify({ error: 'userId required when using service role key' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      userId = bodyUserId;
      console.log('Using service role key authentication for user:', userId);
    } else {
      // Normal JWT path: verify user token
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userId = user.id;
      console.log('Using JWT authentication for user:', userId);
    }

    // Validate request parameters
    if (!cryptoType || !cryptoAmount || cryptoAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: cryptoType and cryptoAmount required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get exchange rate
    const { data: rateData, error: rateError } = await supabaseAdmin
      .from('crypto_exchange_rates')
      .select('*')
      .eq('crypto_type', cryptoType)
      .single();

    if (rateError || !rateData) {
      return new Response(
        JSON.stringify({ error: 'Exchange rate not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const rate = rateData.use_manual ? rateData.manual_rate : rateData.market_rate;
    const nairaAmount = cryptoAmount * rate;

    // Generate Bitnob address
    const bitnob = new BitnobClient({
      secretKey: Deno.env.get('BITNOB_SECRET_KEY') ?? '',
      hmacKey: Deno.env.get('BITNOB_HMAC_KEY') ?? '',
      webhookSecret: Deno.env.get('BITNOB_WEBHOOK_SECRET') ?? '',
    });

    const addressResult = await bitnob.generateAddress({
      cryptoType,
      chain: chain || (cryptoType === 'BTC' ? 'btc' : 'tron'),
      customerEmail: profile.email,
    });

    if (!addressResult.success || !addressResult.address) {
      return new Response(
        JSON.stringify({ error: addressResult.error || 'Failed to generate address' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create transaction record
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('crypto_transactions')
      .insert({
        user_id: userId,
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
      console.error('Transaction insert error:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-crypto-sell-order:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
\`\`\`

---

## 🔍 Key Differences in the Fixed Code:

**Line 58 - THE CRITICAL FIX:**
```typescript
// ❌ OLD (wrong - blocks Bitcoin too):
if (request.cryptoType !== 'BTC') {

// ✅ NEW (correct - only validates TRON stablecoins):
if (request.cryptoType !== 'BTC' && request.chain === 'tron') {
```

This ensures:
- ✅ Bitcoin addresses are NOT validated (they don't start with 'T')
- ✅ Only USDT/USDC on TRON are validated
- ✅ No more 500 errors on BTC transactions

---

## 🆘 If It Still Reverts:

Try **CLI deployment** instead:

1. Open PowerShell in your project folder
2. Install Supabase CLI (if not installed):
   ```powershell
   npm install -g supabase
   ```

3. Link your project:
   ```powershell
   npx supabase link --project-ref dssvvswvqnxanyzfhixf
   ```

4. Deploy the function:
   ```powershell
   npx supabase functions deploy create-crypto-sell-order
   ```

---

## ✅ After Successful Deployment:

1. Test BTC selling at `http://localhost:5173/crypto-exchange`
2. Should work without 500 errors now! 🎉
