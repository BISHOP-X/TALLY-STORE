# TallyStore - AI Agent Instructions

## Project Overview
Nigerian e-commerce platform selling social media accounts with fintech features (crypto exchange, bills payment, SMM services). Built with React + TypeScript + Vite frontend and Supabase backend.

## Architecture

### Dual Balance System
Users have **two balances** in the `profiles` table:
- `wallet_balance` — Main wallet (top-up via Ercas Pay, used for purchases)
- `crypto_balance` — Earned from selling crypto (transfer to wallet or withdraw to bank)

### Frontend → Backend Flow
1. Frontend calls Supabase Edge Functions with `Authorization: Bearer <token>`
2. Edge Functions validate auth, interact with external APIs (SageCloud, NowPayments, SMM Panel)
3. Functions update database and return response

### Key Directories
- `src/lib/supabase.ts` — Main data layer (~1800 lines), all database operations
- `src/contexts/SimpleAuth.tsx` — Auth context with wallet balance state
- `supabase/functions/_shared/` — Reusable API clients for external services
- `supabase/functions/*/index.ts` — Individual Edge Functions

## Essential Patterns

### Edge Function Template
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  // ... auth check, business logic
});
```

### Calling Edge Functions from Frontend
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: value1 },
});
```

### Admin Check
```typescript
// Hardcoded admin: wisdomthedev@gmail.com
// Also check profiles.is_admin column
```

## External API Clients (`_shared/`)

| Client | Service | Purpose |
|--------|---------|---------|
| `sagecloud-client.ts` | SageCloud | Bills (airtime, data), bank transfers |
| `nowpayments-client.ts` | NowPayments | Crypto sell orders |
| `smm-panel-client.ts` | thelordofthepanels.com | Social media marketing services |

## Commands
```bash
bun dev              # Start dev server (port 8080)
bun build            # Production build
supabase functions serve  # Local Edge Function testing
supabase db push     # Apply migrations
```

## Database Conventions
- All amounts stored in NGN (₦)
- Use `idempotency_key` to prevent duplicate transactions
- Tables: `profiles`, `transactions`, `orders`, `crypto_transactions`, `bills_transactions`, `smm_orders`
- Migrations in `supabase/migrations/` with `YYYYMMDDHHMMSS_` prefix

## UI Conventions
- Components use shadcn/ui (`src/components/ui/`)
- Purple/blue gradient theme with dark/light mode
- Balance cards: Green = wallet, Orange = crypto
- Format currency: `amount.toLocaleString()` with ₦ prefix
- Protected routes use `<ProtectedRoute requireRole="user|admin">`

## SMM Pricing Formula
```
Panel rate (USD/1000) × 2 × 1600 (NGN rate) = Selling price in NGN
```

## Before Making Changes
1. Read the full file before editing (check `src/lib/supabase.ts` for database operations)
2. Check `CONTEXT.md` for current feature status and table schemas
3. Verify Edge Function secrets are in Supabase dashboard (not .env)
4. Use existing patterns from similar features (e.g., bills → SMM flow)
