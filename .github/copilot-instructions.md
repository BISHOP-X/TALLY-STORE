# TallyStore - AI Agent Instructions

## Project Overview
Nigerian e-commerce platform for social media accounts with fintech features (crypto exchange, bills, SMM). React + TypeScript + Vite frontend, Supabase (PostgreSQL + Edge Functions) backend.

## Architecture

### Dual Balance System
Users have **two balances** in `profiles` table:
- `wallet_balance` — Main wallet (top-up via Ercas Pay, purchases)
- `crypto_balance` — Earned from selling crypto (transfer to wallet or bank withdrawal)

### Frontend → Backend Flow
```
React Page → src/lib/supabase.ts → Edge Function → External API (SageCloud/NowPayments/SMM Panel)
                  ↓                       ↓
             Direct DB query         Update DB + return response
```

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Central data layer (~1800+ lines) - all database operations |
| `src/contexts/SimpleAuth.tsx` | Auth context with `useAuth()` hook, wallet balance state |
| `src/components/SimpleProtectedRoute.tsx` | Route guards (`<ProtectedRoute requireRole="admin">`) |
| `supabase/functions/_shared/` | Reusable API clients for external services |

### External API Clients (`supabase/functions/_shared/`)
| Client | Service | Usage |
|--------|---------|-------|
| `sagecloud-client.ts` | SageCloud | Bills (airtime, data), bank transfers |
| `nowpayments-client.ts` | NowPayments | Crypto sell orders |
| `smm-panel-client.ts` | thelordofthepanels.com | Social media marketing services |
| `forex-rates.ts` | Currency conversion utilities |

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
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  // Validate auth, business logic, return JSON response
});
```

### Invoking Edge Functions (Frontend)
```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param1: value1 },
});
```

### Admin Check Pattern
```typescript
// Hardcoded admin: wisdomthedev@gmail.com
// Also stored in profiles.is_admin column
const { isAdmin } = useAuth();
```

## Commands
```bash
npm run dev              # Dev server (port 8080)
npm run build            # Production build
supabase functions serve # Local Edge Function testing
supabase db push         # Apply migrations to remote
```

## Database Conventions
- **Currency**: All amounts stored in NGN (₦), display with `amount.toLocaleString()`
- **Idempotency**: Use `idempotency_key` column to prevent duplicate transactions
- **Migrations**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- **RLS**: Row-level security on all user-facing tables

### Key Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User data with `wallet_balance`, `crypto_balance`, `is_admin` |
| `transactions` | Wallet transactions (topup/purchase/refund) |
| `orders` | Product purchases |
| `crypto_transactions` | Crypto sell orders |
| `bills_transactions` | Airtime/data purchases |
| `smm_orders` / `smm_services` | SMM marketing orders and cached services |

## UI Conventions
- **Components**: shadcn/ui in `src/components/ui/`
- **Theme**: Purple/blue gradient, dark/light mode via `next-themes`
- **Balance cards**: Green = wallet, Orange = crypto
- **Loading states**: Use shadcn Button `disabled` prop + spinner
- **Protected routes**: Wrap with `<ProtectedRoute requireRole="user|admin">`

## SMM Pricing Formula
```
Panel rate (USD/1000) × 2 × 1600 = NGN selling price
```

## Before Making Changes
1. **Read full files** before editing (especially `src/lib/supabase.ts`)
2. **Check existing documentation**: `CONTEXT.md` for feature status, `PRD.md` for requirements
3. **Edge Function secrets**: Stored in Supabase dashboard, not `.env` files
4. **Follow existing patterns**: Copy from similar features (e.g., bills → SMM flow)
5. **Ask before assuming**: See `LLM_RULES.md` for context-gathering guidelines
6. **NEVER guess database state** — always query via `mcp_supabase_execute_sql`
7. **Use Context7 MCP** for up-to-date library docs — never guess API signatures
8. **NEVER batch-credit/debit wallets** without explicit user approval and showing exact scope
9. **NEVER manually fire cron jobs** without user confirming what will be processed
10. **Admins may have manually compensated users** — never auto-credit old stuck payments

## Money Safety Rules
- **Insert transaction FIRST, then update wallet** (atomic lock via unique constraint)
- **Unique constraint on `transactions.reference`** prevents double-crediting
- **Check `pending_payments` status check constraint** before setting custom statuses (allowed: pending/credited/failed/expired)
- **Wallet operations are effectively irreversible** — users spend money instantly
- When in doubt about whether a user was already compensated: **DO NOT CREDIT — flag for admin review**

## Supabase Infrastructure (verified facts)
- `current_setting('app.*')` does NOT work — use hardcoded project URL
- `pg_net` extension required for cron HTTP calls — verify it's enabled
- `pg_cron` jobs: check `cron.job_run_details` for failures, not just `cron.job`
- All Edge Functions use `verify_jwt: false` — auth handled in code

## Project Context Files
- `CONTEXT.md` — Current feature status, table schemas, API endpoints
- `LLM_RULES.md` — Guidelines for AI agents (ask before assuming)
- `PRD.md` — Full product requirements document
- `SMS-DOCS.md` — External API documentation
