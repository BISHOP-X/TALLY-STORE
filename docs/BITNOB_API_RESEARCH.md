# BITNOB API IMPLEMENTATION - LEARNING NOTES

**Status:** ✅ DOCUMENTATION COMPLETE (14/14 Read)  
**Date:** November 6, 2025  
**Purpose:** Understand Bitnob API before implementing crypto exchange feature

---

## 🎯 OUR USE CASE

**What We're Building:**
- Users sell crypto (BTC/USDT/USDC) → Get NGN in their crypto_balance
- Users withdraw NGN from crypto_balance → Nigerian bank accounts
- 2% withdrawal fee, ₦500k+ requires admin approval
- ₦1M daily selling limit per user
- 5% exchange rate markup

---

## 📚 DOCUMENTATION SECTIONS TO READ

### ✅ COMPLETED:
1. **Offramps Overview** ✓
2. **Create Quote** ✓
3. **Initialize Quote** ✓
4. **Finalize Quote** ✓
5. **Simulate Address Deposit** ✓
6. **Bitcoin** ✓
7. **Stablecoins** ✓
8. **Stablecoin Webhook** ✓
9. **Beneficiaries Webhook** ✓
10. **Payouts Webhook** ✓
11. **Webhooks (Main Page)** ✓
12. **Payouts API** ✓
13. **Authentication** ✓
14. **Development Mode** ✓

### 🎉 ALL DOCUMENTATION READ!

### ⏳ PENDING:
6. Bitcoin (main crypto receiving)
7. Stablecoins (USDT/USDC receiving)
8. Stablecoin Webhook (payment confirmations)
9. Payouts Webhook (withdrawal confirmations)
10. Beneficiaries Webhook (bank account events)
11. Payouts (Transfer to Mobile Money) (send NGN to banks)
12. Authentication (API keys)
13. Development Mode (sandbox testing)
14. Rate Limiting (API limits)

---

## 🧠 KEY CONCEPTS LEARNED

### **PART 1: OFFRAMPS OVERVIEW**

#### What is Offramps?
- Service to convert crypto (BTC/USDT/USDC) → Local currency (NGN/KES/AUD)
- Supports TRC20, ERC20, Bitcoin mainnet + Lightning Network
- Real-time exchange rates
- **15-minute quote expiry** (critical timing constraint!)

#### Quote Lifecycle (3 Steps):
```
1. CREATE QUOTE
   ↓ Get exchange rate, quoteId, settlement amount
   ↓ User reviews rates
   
2. INITIALIZE QUOTE  
   ↓ Add beneficiary bank details
   ↓ Add payment reason, reference
   ↓ Transaction ready for review
   
3. FINALIZE QUOTE
   ↓ Payment deducted from balance OR received from external address
   ↓ Once confirmed → Settlement begins
```

#### Critical Properties:

**Quote Identifiers:**
- `id` - UUID (internal database)
- `quoteId` - Human-readable (e.g., QT_6156) for tracking
- `reference` - Custom transaction reference

**Money Fields:**
- `satAmount` - Amount in satoshis (BTC)
- `btcAmount` - Amount in BTC
- `amount` - Fiat amount (NGN)
- `centAmount` - Lowest denomination of settlement currency
- `settlementAmount` - What beneficiary receives
- `centFees` - Fees in lowest denomination
- `fees` - Fees in main currency

**Rate & Currency:**
- `exchangeRate.rate` - Current rate
- `exchangeRate.currency` - Target currency (NGN)
- `fromAsset` - Crypto being sold (USDT/USDC/BTC)
- `chain` - Blockchain network (TRC20/ERC20/BTC)
- `toCurrency` - Settlement currency (NGN)

**Status & Timing:**
- `status` - Current state (pending_address_deposit, expired, etc.)
- `expiry` - 15-minute deadline timestamp
- `trip` - Lifecycle timestamps (submitted, quoteSentAt, assetReceived, etc.)

**Payment Source:**
- `source` - Where crypto comes from (onchain/balance)
- `address` - Deposit address (if onchain source)

**Beneficiary:**
- `beneficiaryId` - Reusable beneficiary record
- `beneficiary` - Full bank account details object

**Webhooks:**
- `callbackUrl` - Where to send transaction updates

**Metadata:**
- `clientMetaData` - Custom data provided during initialization
- `customerId` - User who created quote
- `paymentReason` - Reason for payment

#### Fetching Quotes (3 Methods):
```
1. By quoteId:  GET /api/v1/payouts/quotes/{quoteId}
2. By reference: GET /api/v1/payouts/fetch/reference/{reference}
3. By UUID id:   GET /api/v1/payouts/fetch/{id}
```

---

## 🔑 CRITICAL INSIGHTS FOR OUR IMPLEMENTATION

### ⏰ **15-Minute Expiry Rule**
- Quotes expire after 15 minutes
- Must show countdown timer to users
- Auto-cancel expired transactions in our DB
- Need webhook to handle expiry notifications

### 💰 **Two Payment Sources**
1. **Onchain:** User sends crypto to generated address → We wait for blockchain confirmation
2. **Balance:** Deduct from existing Bitnob wallet balance → Instant

**For TallyStore:** We'll use **ONCHAIN** (users don't have Bitnob wallets)

### 🏦 **Beneficiary Management**
- Can save beneficiaries for reuse (`beneficiaryId`)
- For TallyStore: Each withdrawal creates new beneficiary (user's bank account)

### 📊 **Money Tracking**
- Bitnob uses **cent amounts** for precision (e.g., ₦1,650.00 = 165000 cents)
- Must convert between cents and naira in our UI
- Fees calculated in cents

### 🔗 **Quote ID vs Reference**
- `quoteId` = Bitnob's tracking ID (QT_xxxx)
- `reference` = Our custom reference (can use our transaction UUID)
- Store BOTH in our `crypto_transactions` table

### 📡 **Webhooks Required**
- Must implement webhook handler for transaction updates
- callbackUrl provided during quote creation
- Need to handle: confirmed, failed, expired statuses

---

## 🗂️ DATABASE MAPPING (Preliminary)

### Our `crypto_transactions` Table Maps To:
- `user_id` → `customerId` (Bitnob)
- `crypto_type` → `fromAsset` (USDT/USDC/BTC)
- `crypto_amount` → `btcAmount` or equivalent
- `naira_amount` → `settlementAmount`
- `exchange_rate` → `exchangeRate.rate`
- `deposit_address` → `address`
- `bitnob_quote_id` (NEW FIELD NEEDED) → `quoteId`
- `bitnob_reference` (NEW FIELD NEEDED) → `reference`
- `status` → `status`
- `expires_at` → `expiry`

### Our `crypto_withdrawals` Table Maps To:
- Similar to above but for payouts
- Need `bitnob_beneficiary_id` field

---

## ❓ QUESTIONS TO ANSWER (From Remaining Docs)

### From "Create Quote":
- [x] What's the exact API endpoint and payload? → `POST /api/v1/payouts/quotes`
- [x] How to specify NGN as settlement currency? → `toCurrency: "ngn"`
- [ ] How to set callbackUrl for webhooks? (Not in Create Quote - likely in Initialize)
- [x] What blockchain networks to support? → TRC20 (USDT), ERC20 (USDC), BTC/Lightning
- [ ] Can we set custom references? (Not in Create Quote - likely in Initialize)
- [x] **Amount format:** MUST use cents (50 USDT = 5000 cents)
- [ ] **Settlement amount format:** Is it in kobo (cents) or naira? Need clarification

### From "Initialize Quote":
- [x] What bank account fields are required? → type, bankCode, accountNumber
- [x] How to format Nigerian bank codes? → Standard codes (need list)
- [x] Can we skip saving beneficiary? → YES, use beneficiary object directly
- [x] What payment reasons are valid? → Any text string
- [x] **callbackUrl discovered!** → This is where webhooks are sent
- [x] **Address generated here** → But don't show to user yet!
- [x] **Bank validates account** → Returns accountName for confirmation

### From "Finalize Quote":
- [x] How to finalize with onchain source? → Simple POST with just quoteId
- [x] Do we need to poll for payment confirmation? → NO! Webhooks handle it
- [x] Or does webhook handle it automatically? → YES! 
- [x] **Status changes** → "initiated" → "pending_address_deposit"
- [x] **ONLY after finalize** → Show address to user
- [x] **EXACT amount required** → User must send precise amount (no more/less)

### From "Simulate Address Deposit":
- [x] Is this for testing only? → YES, sandbox environment only
- [x] How to test without real crypto in sandbox? → Use simulate-address-deposit endpoint
- [x] **Perfect for development** → Can test full flow without real funds

### From "Bitcoin" & "Stablecoins":
- [ ] How to generate unique deposit addresses?
- [ ] Lightning Network support? (instant, cheap BTC)
- [ ] Which USDT network to use? (TRC20 cheaper than ERC20)
- [ ] Confirmation times for each network?

### From "Webhooks":
- [ ] Webhook signature verification (security)
- [ ] What events are sent?
- [ ] Payload structure for each event
- [ ] Retry logic if our endpoint fails?

### From "Payouts":
- [ ] Is this different from Offramps?
- [ ] Or is it the same thing?
- [ ] Fee structure details

### From "Authentication":
- [ ] API key format
- [ ] How to authenticate requests (headers)
- [ ] Sandbox vs Live keys
- [ ] Rate limits per key

### From "Development Mode":
- [ ] How to get sandbox API keys
- [ ] Test environment URLs
- [ ] Mock data for testing
- [ ] How to simulate crypto deposits

---

## 🚀 IMPLEMENTATION PLAN (Will Update After All Docs)

### Phase 1: Database Updates
- [ ] Add `bitnob_quote_id` to crypto_transactions
- [ ] Add `bitnob_reference` to crypto_transactions
- [ ] Add `bitnob_beneficiary_id` to crypto_withdrawals
- [ ] Add `chain` field (TRC20/ERC20/BTC) to crypto_transactions
- [ ] Update `crypto_type` enum if needed

### Phase 2: Backend - Quote Creation (Sell Crypto Flow)
- [ ] Edge Function: `create-bitnob-quote`
- [ ] Generate unique deposit address
- [ ] Store quote in DB with 15-min expiry
- [ ] Return address + QR code to user

### Phase 3: Webhook Handler
- [ ] Edge Function: `bitnob-webhook`
- [ ] Verify webhook signatures
- [ ] Handle payment confirmations
- [ ] Credit crypto_balance
- [ ] Update transaction status
- [ ] Send user notifications

### Phase 4: Backend - Withdrawals (Payout Flow)
- [ ] Edge Function: `create-bitnob-payout`
- [ ] Validate bank account
- [ ] Calculate 2% fee
- [ ] Create payout quote
- [ ] Handle approval for ≥₦500k

### Phase 5: Frontend UI
- [ ] Crypto exchange page
- [ ] Deposit address display with QR code
- [ ] Countdown timer (15 min)
- [ ] Withdrawal form
- [ ] Transaction history

### Phase 6: Testing
- [ ] Sandbox testing with test crypto
- [ ] Webhook testing
- [ ] Expiry handling
- [ ] Error scenarios

### Phase 7: Production
- [ ] Get live API keys
- [ ] Switch to mainnet
- [ ] Monitor first transactions
- [ ] Performance tuning

---

## 📝 NOTES FROM READING SESSION

### Part 1 Notes (Offramps Overview):
- Bitnob's Offramps is EXACTLY what we need (crypto → NGN)
- 3-step quote process matches our flow perfectly
- 15-minute expiry is tight but manageable with good UX
- Webhook support means real-time updates
- Quote tracking with multiple ID types is flexible
- Comprehensive money tracking (sats, BTC, fiat, cents)

**Confidence Level:** 🟢 High - This looks like a solid API for our needs

---

### Part 2 Notes (Create Quote):

**Endpoint:** `POST /api/v1/payouts/quotes`

**Request Payload:**
```json
{
  "fromAsset": "usdt",      // Options: "usdt", "usdc", "btc"
  "toCurrency": "ngn",      // Settlement currency
  "source": "onchain",      // "onchain" or "balance" (we use onchain)
  "chain": "trc20",         // "trc20", "erc20", "btc", "lightning"
  "amount": 20000           // ⚠️ CRITICAL: In CENTS (20000 = $200 USD)
}
```

**🚨 CRITICAL AMOUNT ISSUE:**
- `amount` must be in **lowest denomination** (cents for USD)
- $200 USD = 20000 cents
- $50 USD = 5000 cents
- $1 USDT = 100 cents
- **For TallyStore:** User enters "50 USDT" → Backend sends `amount: 5000`

**Sample Response:**
```json
{
  "status": true,
  "message": "OffRamp quote generated successfully",
  "data": {
    "id": "6ae40f3c-0eb5-478e-8892-560ee427ee3c",
    "status": "quote",                    // Status after creation
    "settlementCurrency": "NGN",
    "exchangeRate": 1626.1,               // ₦1,626.1 per $1 USD
    "quoteId": "QT_6156",                 // Track with this
    "settlementAmount": 325220,           // ₦325,220 (in cents? or naira?)
    "amount": 200,                        // Confirmed: $200 USD
    "expiryTimeStamp": 1736937216,        // Unix timestamp
    "expiresInText": "This quote expires in 15 minutes",
    "quoteText": "NGN 325,220 will be settled for this transaction"
  }
}
```

**Key Insights:**
1. **Quote Status = "quote"** initially (before initialization)
2. **Exchange Rate**: ₦1,626.1/$1 USD (Bitnob's rate - we'll add 5% markup in UI)
3. **Settlement Amount**: Appears to be in naira (325220 = ₦3,252.20?)
   - ⚠️ **QUESTION:** Is settlementAmount in cents or naira? Need to verify!
   - $200 × ₦1,626.1 = ₦325,220 (matches - likely in KOBO/cents)
4. **Expiry Timestamp**: Unix timestamp for countdown timer
5. **No deposit address yet** - comes in next step (Initialize)

**For TallyStore Implementation:**
- User sees: "Sell 50 USDT for ₦82,900" (with our 5% markup)
- Backend sends: `amount: 5000` (50 × 100 cents)
- Bitnob returns: Rate + settlement amount
- We add 5% markup BEFORE showing to user
- Store `quoteId` in our DB immediately

**Chain Selection Strategy:**
- USDT: Use **TRC20** (cheaper gas fees than ERC20)
- USDC: Use **ERC20** (most common)
- BTC: Use **lightning** if available (instant + cheap), else **btc**

**Confidence Level:** 🟢 High - Clear API structure

---

### Part 3 Notes (Initialize Quote):

**Endpoint:** `POST /api/v1/payouts/initialize`

**Request Payload:**
```json
{
  "quoteId": "QT_6156",                                      // From Create Quote
  "customerId": "6ae40f3c-0eb5-478e-8892-560bb547rt3d",     // Our user_id
  "country": "NG",                                           // Nigeria
  "reference": "off_QT_ref-10a4",                           // ✅ CUSTOM REFERENCE (our transaction UUID!)
  "beneficiaryId": "a21b99cb-e00d-4f39-8486-6f82e0e78dee",  // Reuse saved beneficiary (optional)
  "beneficiary": {                                           // OR provide new bank details
    "type": "BANK",                                          // "BANK" or "MOBILE_MONEY"
    "bankCode": "110072",                                    // Nigerian bank code
    "accountNumber": "1421795566"                            // Account number
  },
  "paymentReason": "Funds for stuff",                       // Required reason
  "callbackUrl": "https://example.com/callback/id",         // ✅ WEBHOOK URL!
  "clientMetaData": {                                        // Custom data we want stored
    "name": "john doe",
    "height": "194"
  }
}
```

**Key Insights:**
1. ✅ **Custom Reference:** Can use our transaction UUID here!
2. ✅ **Webhook URL:** `callbackUrl` set here, not in Create Quote
3. **Beneficiary Options:** Either `beneficiaryId` (reuse) OR `beneficiary` object (new)
4. **Bank Details:** Need `bankCode` + `accountNumber` (no account name validation yet)
5. **Client Metadata:** Store any custom data (user email, transaction type, etc.)

**Sample Response:**
```json
{
  "status": true,
  "message": "OffRamp quote initialized successfully",
  "data": {
    "id": "6ae40f3c-0eb5-478e-8892-560ee427ee3c",
    "status": "initiated",                           // 🚨 Status changed from "quote" to "initiated"
    "quoteId": "QT_6156",
    "reference": "off_QT_ref-10a4",                  // Our custom reference confirmed
    "address": "TS8bXUyq2QdyYceKVxcvJpHQ6NX6qY2xaZ",  // ⚠️ ADDRESS PROVIDED BUT DON'T USE YET!
    "chain": "trc20",
    "fromAsset": "usdt",
    "amount": 200,                                    // $200 USD
    "btcAmount": 0.00211578,                         // BTC equivalent
    "satAmount": 211578,                             // Satoshi equivalent
    "exchangeRate": 1626.1,
    "settlementAmount": 325220,
    "settlementCurrency": "ngn",
    "fees": 0,                                       // No fees at this stage
    "paymentETA": "3-5 minutes",                     // Settlement time after payment
    "expiryTimeStamp": 1736937230,
    "expiresInText": "This invoice expires in 15 minutes",
    "paymentReason": "Funds for stuff",
    "beneficiaryDetails": {
      "id": "e8455a92-65a6-4ad0-b902-ba51392de269",
      "status": "success",
      "country": "NG",
      "currency": "NGN",
      "reference": "QT_6156_86cadb25a4ac",
      "destination": {
        "type": "BANK",
        "bankCode": "000014",
        "accountName": "JANE DOE",                   // ✅ Account name validated!
        "accountNumber": "1421795566"
      },
      "createdAt": "2025-01-15T10:17:49.419Z",
      "updatedAt": "2025-01-15T10:17:49.419Z"
    }
  }
}
```

**Critical Discovery:**
🚨 **Address is provided but DO NOT show to user yet!**
- Must finalize quote first before accepting payment
- Documentation warns: "payment should not be made to the address until the quote has been finalized"

**Beneficiary Validation:**
- Bitnob validates bank account and returns `accountName`
- We can show "Funds will be sent to: JANE DOE - 142179***" for confirmation

---

### Part 4 Notes (Finalize Quote):

**Endpoint:** `POST /api/v1/payouts/finalize`

**Request Payload:**
```json
{
  "quoteId": "QT_6156"  // That's it! Just the quote ID
}
```

**Sample Response:**
```json
{
  "status": true,
  "message": "OffRamp quote finalized successfully",
  "data": {
    "id": "6ae40f3c-0eb5-478e-8892-560ee427ee3c",
    "status": "pending_address_deposit",             // 🚨 NOW waiting for crypto payment!
    "quoteId": "QT_6156",
    "reference": "off_QT_ref-10a4",
    "address": "TS8bXUyq2QdyYceKVxcvJpHQ6NX6qY2xaZ",  // ✅ NOW show this to user!
    "chain": "trc20",
    "fromAsset": "usdt",
    "amount": 200,
    "btcAmount": 0.00211578,
    "satAmount": 211578,
    "exchangeRate": 1626.1,
    "settlementAmount": 325220,
    "settlementCurrency": "ngn",
    "fees": 0,
    "paymentETA": "3-5 minutes",                     // Settlement ETA after payment received
    "paymentReason": "Funds for stuff",
    "expiryTimeStamp": 1736937230,
    "expiresInText": "This invoice expires in 15 minutes",
    "beneficiaryDetails": { /* same as Initialize */ }
  }
}
```

**Key Insights:**
1. **Status Flow:** `quote` → `initiated` → `pending_address_deposit`
2. **Now Safe to Accept Payment:** Show deposit address + QR code to user
3. **Exact Amount Required:** User MUST send exactly `amount` (200 USDT in this case)
4. **Payment ETA:** 3-5 minutes for settlement AFTER crypto received
5. **Webhook Will Fire:** When payment received, status changes, webhook notifies us

**For TallyStore Flow:**
```
1. User: "Sell 50 USDT for ₦82,900"
2. Backend: Create Quote (get rate)
3. Backend: Initialize Quote (add user's bank details, webhook URL)
4. Backend: Finalize Quote (get deposit address)
5. Frontend: Show deposit address + QR + countdown timer
6. User: Sends 50 USDT to address
7. Bitnob: Detects payment, sends webhook
8. Backend: Credit crypto_balance, update transaction status
9. Bitnob: Settles ₦82,900 to... WAIT, where does it go?
```

🚨 **CRITICAL QUESTION:** 
- In this example, beneficiary = user's bank account
- But we want: Crypto → User's crypto_balance (NOT direct to bank)
- **Do we skip beneficiary in Initialize?** Need to check if beneficiary is optional!

---

### Part 5 Notes (Simulate Address Deposit):

**Endpoint:** `POST /api/v1/payouts/simulate-address-deposit` (Sandbox ONLY!)

**Request Payload:**
```json
{
  "address": "TS8bXUyq2QdyYceKVxcvJpHQ6NX6qY2xaZ",  // From finalized quote
  "amount": 200                                     // Exact amount from quote
}
```

**Sample Response:**
```json
{
  "status": true,
  "message": "OffRamp simulate address deposit successfully",
  "data": {
    "success": true
  }
}
```

**For Testing:**
- No real crypto needed in sandbox
- Simulate payment to test webhook flow
- Must use EXACT amount from quote
- Only works in sandbox environment

**Testing Strategy:**
1. Create + Initialize + Finalize quote in sandbox
2. Get deposit address
3. Call simulate-address-deposit endpoint
4. Webhook should fire immediately
5. Verify our webhook handler works correctly

**Confidence Level:** 🟢 High - Testing flow is clear

---

### Part 6 Notes (Bitcoin - Receiving):

**🎉 BREAKTHROUGH! This is what we need - Direct Bitcoin receiving WITHOUT Offramps!**

**How It Works:**
1. Generate a Bitcoin address for user
2. User sends BTC to that address
3. Bitnob detects payment → Sends webhook
4. We credit user's crypto_balance (in our DB)
5. Later: User withdraws using Offramps OR Payouts API

**Address Generation:**
- API can generate **millions of addresses**
- **Best Practice:** Generate NEW address for EACH transaction (privacy)
- Address stays valid forever (old addresses still receive webhooks)

**Address Types Supported:**
1. **Legacy (P2PKH):** Starts with "1", highest fees, oldest format
   - Example: `1K1cP1eP0QTefi5DMPTfTL53smv7DivfNa`
2. **P2SH:** Starts with "3", medium fees
   - Example: `3GRdnTq18LyNveWa1gQJcgp8qEnzijv5vR`
3. **Bech32 (P2WPKH):** Starts with "bc1", **lowest fees, fastest** (DEFAULT)
   - Example: `bc1qnkyhslv83yyp0q0suxw0uj3lg9drgqq9c0auzc`

**For TallyStore:** Use **Bech32 (default)** - lowest fees, best for users

**Webhook Event:**
- Event: `btc.onchain.received.success`
- Fires when payment detected
- **Wait for 3+ confirmations** before crediting user (security)
- Can re-query transaction for confirmation count

**Bitcoin Sending (Bonus):**
- Simple: Just specify amount + address
- Bitnob handles fees automatically (batches transactions)
- Webhook contains transaction hash for tracking
- Use mempool.space or blockstream.info to track

**Testing:**
- Get testnet BTC from: https://signet.bc-2.jp/
- Generate receive address in sandbox
- Test webhook flow

**Key Insights:**
✅ **This solves our problem!** Direct receiving to Bitnob wallet
✅ **No bank account needed** during receiving
✅ **Webhook-driven** - real-time notifications
✅ **Address reuse works** but new address recommended per transaction
✅ **Confirmation tracking** - can verify payment security

**For TallyStore Implementation:**
```
RECEIVING FLOW (Better than Offramps!):
1. User: "Sell 0.001 BTC for ₦95,000"
2. Backend: Generate new Bitcoin address (Bech32)
3. Frontend: Show address + QR code + countdown timer
4. User: Sends 0.001 BTC to address
5. Bitnob: Detects payment → Sends webhook (btc.onchain.received.success)
6. Backend: Wait for 3 confirmations
7. Backend: Credit crypto_balance (₦95,000 with our 5% markup)
8. User: Can withdraw to bank later using Payouts API

WITHDRAWAL FLOW (Use Offramps or Payouts):
1. User: "Withdraw ₦50,000 to my bank"
2. Backend: Use Offramps OR Payouts API
3. Deduct from our Bitnob wallet balance
4. Send to user's bank account
5. Deduct from user's crypto_balance in our DB
```

**Confidence Level:** 🟢🟢 VERY HIGH - This is the right approach!

---

### Part 7 Notes (Stablecoins):

**What are Stablecoins:**
- Digital tokens pegged to stable assets (USD, gold, etc.)
- Bitnob uses them to transact with USD on blockchain networks

**Supported Chains:**
- ✅ **ETHEREUM** (ERC20) - USDT + USDC
- ✅ **POLYGON** - USDT + USDC  
- ✅ **BSC (Binance Smart Chain)** - USDT + USDC
- ❌ **TRON (TRC20)** - NOT SUPPORTED for USDC (USDT support unclear)

🚨 **CRITICAL LIMITATION:** NO TRON TRC20 SUPPORT!
- TRC20 is the CHEAPEST network for USDT (pennies per transaction)
- Ethereum/Polygon/BSC have higher gas fees
- This might increase costs for users

**Stablecoin Fees:**
- **Flat $1 USD fee** for all stablecoin transactions
- Applied to receiving? Sending? Both? (Unclear - need to test)

**Key Insights:**
1. **Network Choice:**
   - POLYGON = Best alternative (low gas fees, widely supported)
   - ETHEREUM = Most common but expensive gas
   - BSC = Good alternative, lower fees than Ethereum
   
2. **Our Client Required TRC20** but Bitnob doesn't support it! 🚨
   - Original requirement: Support USDT via TRC20
   - Bitnob limitation: Only ERC20/Polygon/BSC
   - **Decision needed:** Accept this limitation or look for alternative provider

3. **$1 Fee Impact:**
   - For small transactions (<$50), $1 fee is significant (2%+)
   - For large transactions ($500+), $1 fee is minimal (0.2%)
   - Need to communicate fee clearly to users

**For TallyStore Implementation:**
```
NETWORK STRATEGY:
1. PRIMARY: POLYGON (low gas + $1 Bitnob fee)
2. BACKUP: BSC (also low gas)
3. AVOID: ETHEREUM (high gas fees hurt users)

STABLECOIN SUPPORT:
✅ USDT - Polygon/BSC/Ethereum
✅ USDC - Polygon/BSC/Ethereum
❌ USDT TRC20 - Not supported (client requirement conflict!)
```

**Questions to Answer:**
- [ ] Is $1 fee for receiving, sending, or both?
- [ ] Can we choose which network to generate addresses for?
- [ ] Does webhook differ between chains?
- [ ] How to handle network selection in UI?

**Confidence Level:** 🟡 MEDIUM - Network limitation is concerning

**⚠️ CLIENT REQUIREMENT CONFLICT:**
- Client asked for: "USDT/USDC/SOL support via TRC20"
- Bitnob offers: USDT/USDC on ERC20/Polygon/BSC (NO TRC20, NO SOL)
- **Need to discuss with client:** Accept Polygon/BSC or find different provider

---

### Part 8 Notes (Stablecoin Webhooks):

**🎉 MAJOR DISCOVERY: TRON IS SUPPORTED!** (Documentation was misleading!)

**Webhook Events:**

**For RECEIVING (What we need!):**
1. `stablecoin.usdt.received.success` - USDT payment received
2. `stablecoin.usdc.received.success` - USDC payment received

**For SENDING (Withdrawals):**
3. `stablecoin.usdt.send.success` - USDT sent successfully
4. `stablecoin.usdc.send.success` - USDC sent successfully
5. `stablecoin.usdt.send.failed` - USDT send failed
6. `stablecoin.usdc.send.failed` - USDC send failed

**Webhook Payload Structure (RECEIVE USDT):**
```json
{
  "event": "stablecoin.usdt.received.success",
  "data": {
    "id": "00000000-000f-0de0-00c0-b00d0000f0000",     // Transaction ID
    "reference": "RCV_USDT_efb561a0ec00",              // Bitnob reference
    "hash": "dd5b379860230220ea2d9f52f5acdd689...",    // Blockchain tx hash
    "chain": "tron",                                    // 🎉 TRON IS SUPPORTED!
    "address": "TWSUGichZgXfcrkyPnars1TMV7QmKb1VRj",   // Receiving address
    "amount": "11.81",                                  // USD amount ($11.81)
    "centAmount": "1181",                               // Amount in cents (1181 cents)
    "fees": "0",                                        // Fees in USD
    "centFees": "0",                                    // Fees in cents
    "type": "credit",                                   // credit = receive
    "action": "receive_usdt",
    "channel": "onchain",
    "confirmations": 19,                                // Blockchain confirmations
    "description": "received USDT payment",
    "companyId": "00000000-000f-0de0-00c0-b00d0000f0000"
  }
}
```

**🚨 CRITICAL DISCOVERY:**
- Example shows `"chain": "tron"` in webhook! 
- **TRON IS SUPPORTED!** (Stablecoins doc said "don't support USDC on TRON")
- Means: USDT TRC20 works, USDC TRC20 doesn't
- **This changes everything!**

**USDC Receive Webhook (Same structure):**
```json
{
  "event": "stablecoin.usdc.received.success",
  "data": {
    "chain": "tron",  // Also shows TRON support
    "action": "receive_usdc",
    // ... same fields as USDT
  }
}
```

**Send Success Webhook (For our withdrawals):**
```json
{
  "event": "stablecoin.usdt.send.success",
  "data": {
    "type": "debit",                // debit = send
    "action": "send_usdt",
    "fees": "1",                    // $1 fee confirmed
    "centFees": "100",              // 100 cents = $1
    "hash": "0xbe4b8b8...",         // Transaction hash (can track on explorer)
    "confirmations": 19,
    // ... similar structure
  }
}
```

**Failed Webhook (Error handling):**
```json
{
  "event": "stablecoin.usdt.send.failed",
  "data": {
    "hash": null,                   // No tx hash if failed
    "confirmations": null,
    // ... we need to refund user if this fires
  }
}
```

**Key Insights:**

1. **TRON SUPPORT CONFIRMED!** 
   - Webhooks show `"chain": "tron"` examples
   - **Limitation:** USDT TRC20 ✅ | USDC TRC20 ❌
   - Client requirement partially met!

2. **Confirmation Count Tracking:**
   - Webhook includes `confirmations` field
   - Can implement "Wait for 3+ confirmations" rule
   - Show "Pending (2/3 confirmations)" in UI

3. **Fee Tracking:**
   - `fees` and `centFees` in every webhook
   - $1 fee confirmed for sends
   - $0 fee for receives (good!)

4. **Amount Format:**
   - `amount` = String in USD ("11.81")
   - `centAmount` = Integer in cents (1181)
   - Use `centAmount` for precision (avoid float errors)

5. **Transaction Hash:**
   - Can use `hash` to link to blockchain explorers
   - Show "View on Tronscan" button in UI

6. **Reference Field:**
   - Bitnob generates reference (RCV_USDT_xxxx, SND_STABLE_xxxx)
   - Store this in our DB for support queries

**For TallyStore Implementation:**

```javascript
// Webhook Handler Pseudocode
async function handleStablecoinWebhook(payload) {
  const { event, data } = payload;
  
  if (event === 'stablecoin.usdt.received.success' || 
      event === 'stablecoin.usdc.received.success') {
    
    // 1. Verify webhook signature (see main Webhooks doc)
    // 2. Check confirmations >= 3
    if (data.confirmations >= 3) {
      // 3. Find transaction by address
      const tx = await db.crypto_transactions.findBy({ deposit_address: data.address });
      
      // 4. Verify amount matches
      const expectedCents = tx.crypto_amount * 100; // Convert to cents
      if (data.centAmount === expectedCents) {
        // 5. Calculate NGN amount with 5% markup
        const ngnAmount = tx.naira_amount;
        
        // 6. Credit user's crypto_balance
        await db.credit_crypto_balance(tx.user_id, ngnAmount);
        
        // 7. Update transaction status
        await db.crypto_transactions.update(tx.id, {
          status: 'confirmed',
          bitnob_reference: data.reference,
          blockchain_hash: data.hash,
          confirmed_at: new Date()
        });
        
        // 8. Send notification to user
        await sendNotification(tx.user_id, `Your ${data.action.includes('usdt') ? 'USDT' : 'USDC'} sale is complete! ₦${ngnAmount.toLocaleString()} added to your balance.`);
      }
    } else {
      // Update pending confirmations
      await db.crypto_transactions.update(tx.id, {
        confirmations: data.confirmations
      });
    }
  }
  
  if (event === 'stablecoin.usdt.send.failed' || 
      event === 'stablecoin.usdc.send.failed') {
    // Handle failed withdrawal - refund user
    const withdrawal = await db.crypto_withdrawals.findBy({ bitnob_reference: data.reference });
    await db.credit_crypto_balance(withdrawal.user_id, withdrawal.amount);
    await db.crypto_withdrawals.update(withdrawal.id, { status: 'failed' });
  }
}
```

**Database Updates Needed:**
- Add `bitnob_reference` field to crypto_transactions
- Add `blockchain_hash` field to crypto_transactions
- Add `confirmations` field to crypto_transactions (track progress)
- Add `chain` field to crypto_transactions (tron/ethereum/polygon/bsc)

**Confidence Level:** 🟢🟢🟢 VERY HIGH - Webhook structure is clear and complete!

**TRON SUPPORT STATUS:** 
- ✅ USDT TRC20 - SUPPORTED!
- ❌ USDC TRC20 - NOT SUPPORTED
- ✅ USDT/USDC on Ethereum/Polygon/BSC - SUPPORTED

---

### Part 9 Notes (Beneficiaries Webhook):

**When It Fires:**
- When adding a bank account (beneficiary) for withdrawals

**Events:**
1. `beneficiary.status.pending` - Immediately after adding beneficiary
2. `beneficiary.status.success` - Beneficiary verified and ready
3. `beneficiary.status.changed` - Status update (pending→success)

**Webhook Payload:**
```json
{
  "event": "beneficiary.status.success",
  "data": {
    "id": "56af31e1-e37d-4076-bb47-a1b9c762f8db",      // Beneficiary ID
    "reference": "27dad4dfd3bb",                        // Our reference
    "status": "success",                                // ready to receive funds
    "callbackUrl": null,
    "companyId": "7c1cf6e0-92d7-45a4-abc8-1548ef6c0ffd"
  }
}
```

**For TallyStore:**
- NOT critical (we add beneficiary during withdrawal, not separately)
- Could use for validation feedback: "Bank account verified ✓"
- Status flow: pending → success (usually instant for Nigerian banks)

**Confidence Level:** 🟢 Low priority - Nice to have, not essential

---

### Part 10 Notes (Payouts Webhook):

**When It Fires:**
- When sending money to bank accounts (withdrawals)

**Events:**
1. `payout.transfer.success` - Money sent to bank successfully
2. `payout.transfer.failed` - Transfer failed (refund user)

**Success Webhook:**
```json
{
  "event": "payout.transfer.success",
  "data": {
    "id": "1ad3d098-e6f4-4811-9a74-ae5371b3d722",     // Transaction ID
    "reference": "45b873bd49fa",                       // Our reference
    "status": "success",
    "type": "debit",                                   // Debit from wallet
    "action": "ngn_account_payout",                    // Nigerian payout
    "amount": "35.81",                                 // Amount sent
    "fees": "0",                                       // Fees charged
    "channel": "payout",
    "callbackUrl": "",
    "companyId": "45422f21-9a0e-479e-9e10-615556448a78"
  }
}
```

**Failed Webhook:**
```json
{
  "event": "payout.transfer.failed",
  "data": {
    "status": "failed",
    "amount": "30",
    // ... same structure
  }
}
```

**Key Insights:**
1. **Action Types:**
   - `ngn_account_payout` - Nigerian bank transfer
   - `ghs_account_payout` - Ghana payout (other countries supported)

2. **Fees Field:**
   - Shows as "0" in examples (is this accurate or example data?)
   - Need to verify actual payout fees when testing

3. **For TallyStore Withdrawals:**
```javascript
// Webhook Handler for Withdrawals
if (event === 'payout.transfer.success') {
  // 1. Find withdrawal by reference
  const withdrawal = await db.crypto_withdrawals.findBy({ 
    reference: data.reference 
  });
  
  // 2. Mark as completed
  await db.crypto_withdrawals.update(withdrawal.id, {
    status: 'completed',
    completed_at: new Date()
  });
  
  // 3. Send notification
  await sendNotification(withdrawal.user_id, 
    `₦${data.amount} sent to your bank account successfully!`
  );
}

if (event === 'payout.transfer.failed') {
  // 1. Find withdrawal
  const withdrawal = await db.crypto_withdrawals.findBy({ 
    reference: data.reference 
  });
  
  // 2. Refund user's crypto_balance
  await db.credit_crypto_balance(withdrawal.user_id, withdrawal.amount);
  
  // 3. Mark as failed
  await db.crypto_withdrawals.update(withdrawal.id, {
    status: 'failed',
    rejection_reason: 'Bank transfer failed - funds returned to your balance'
  });
  
  // 4. Notify user
  await sendNotification(withdrawal.user_id, 
    `Withdrawal failed. ₦${withdrawal.amount} returned to your balance.`
  );
}
```

**Confidence Level:** 🟢🟢 HIGH - Critical for withdrawal completion tracking

---

### Part 11 Notes (Webhooks - Main Page - SECURITY):

**🔒 CRITICAL: Signature Verification!**

**How Webhooks Work:**
- Bitnob sends POST request to your webhook URL
- You MUST return `200 OK` (or they retry 3 times)
- Contains `x-bitnob-signature` header for verification

**Signature Verification (HMAC SHA512):**
```javascript
const crypto = require('crypto');
const webhookSecret = process.env.BITNOB_WEBHOOK_SECRET; // From dashboard

app.post("/webhook_url", function(req, res) {
  // 1. Create hash of request body
  const hash = crypto
    .createHmac('sha512', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  // 2. Compare with header signature
  if (hash === req.headers['x-bitnob-signature']) {
    // ✅ Verified - this is from Bitnob
    const event = req.body;
    // Process event...
  } else {
    // ❌ Fraudulent request - ignore!
    console.log('Invalid signature - potential fraud attempt');
  }
  
  // 3. Always return 200 (even if verification fails)
  res.send(200);
});
```

**Complete Event Type List:**

**Bitcoin Events (We need these!):**
- ✅ `btc.onchain.received.success` - BTC payment received
- ✅ `btc.onchain.send.success` - BTC withdrawal successful
- ✅ `btc.onchain.send.failed` - BTC withdrawal failed
- `btc.lightning.received.success` - Lightning payment (bonus feature)
- `btc.lightning.send.success` - Lightning send (bonus)
- `btc.lightning.send.failed` - Lightning failed (bonus)

**Stablecoin Events (We need these!):**
- ✅ `stablecoin.usdt.received.success` - USDT received
- ✅ `stablecoin.usdc.received.success` - USDC received
- ✅ `stablecoin.usdt.send.success` - USDT withdrawal successful
- ✅ `stablecoin.usdc.send.success` - USDC withdrawal successful
- ✅ `stablecoin.usdt.send.failed` - USDT withdrawal failed
- ✅ `stablecoin.usdc.send.failed` - USDC withdrawal failed

**Mobile Payment Events (For withdrawals!):**
- ✅ `mobilepayment.paid.success` - Invoice paid
- ✅ `mobilepayment.settlement.success` - NGN sent to bank
- ✅ `mobilepayment.settlement.failed` - Settlement failed

**Other Events (Ignore):**
- Virtual card events (not relevant)
- Checkout events (not relevant)

**Retry Logic:**
- Failed webhook (non-200 response) = 3 retries
- Must handle duplicate events (use idempotency - check if already processed)

**Best Practices:**

1. **Always Return 200:**
   - Even if verification fails
   - Even if processing fails
   - Process async to avoid timeout

2. **Idempotency:**
```javascript
async function processWebhook(event) {
  const { event: eventType, data } = event;
  
  // Check if already processed
  const existing = await db.webhook_events.findBy({ 
    bitnob_transaction_id: data.id 
  });
  
  if (existing) {
    console.log('Duplicate webhook - already processed');
    return; // Don't process twice!
  }
  
  // Process event...
  
  // Mark as processed
  await db.webhook_events.create({
    bitnob_transaction_id: data.id,
    event_type: eventType,
    processed_at: new Date()
  });
}
```

3. **Backup Polling:**
   - Don't rely 100% on webhooks
   - Poll Bitnob API every 5-10 minutes to catch missed events
   - Webhook = real-time, polling = safety net

4. **Testing Webhooks Locally:**
   - Use **ngrok** or **localtunnel** to expose localhost
   - Update webhook URL in Bitnob dashboard (test mode only!)
   - Example: `https://abc123.ngrok.io/api/bitnob-webhook`

**For TallyStore Supabase Edge Function:**
```typescript
// supabase/functions/bitnob-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // 1. Verify signature
    const signature = req.headers.get('x-bitnob-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('BITNOB_WEBHOOK_SECRET');
    
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(webhookSecret + body)
    );
    const expectedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (signature !== expectedSignature) {
      console.error('Invalid signature');
      return new Response('OK', { status: 200 }); // Still return 200!
    }
    
    // 2. Parse event
    const event = JSON.parse(body);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 3. Check idempotency
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('bitnob_transaction_id', event.data.id)
      .single();
    
    if (existing) {
      return new Response('OK', { status: 200 });
    }
    
    // 4. Process event
    await processEvent(event, supabase);
    
    // 5. Log as processed
    await supabase.from('webhook_events').insert({
      bitnob_transaction_id: event.data.id,
      event_type: event.event,
      processed_at: new Date().toISOString()
    });
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200 }); // ALWAYS return 200!
  }
});

async function processEvent(event: any, supabase: any) {
  const { event: eventType, data } = event;
  
  // Handle crypto received
  if (eventType === 'stablecoin.usdt.received.success' ||
      eventType === 'stablecoin.usdc.received.success' ||
      eventType === 'btc.onchain.received.success') {
    
    if (data.confirmations >= 3) {
      // Credit user's crypto_balance
      const { data: tx } = await supabase
        .from('crypto_transactions')
        .select('*')
        .eq('deposit_address', data.address)
        .single();
      
      if (tx) {
        await supabase.rpc('credit_crypto_balance', {
          p_user_id: tx.user_id,
          p_amount: tx.naira_amount
        });
        
        await supabase
          .from('crypto_transactions')
          .update({
            status: 'confirmed',
            blockchain_hash: data.hash,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', tx.id);
      }
    }
  }
  
  // Handle withdrawal success
  if (eventType === 'payout.transfer.success' ||
      eventType === 'mobilepayment.settlement.success') {
    const { data: withdrawal } = await supabase
      .from('crypto_withdrawals')
      .select('*')
      .eq('reference', data.reference)
      .single();
    
    if (withdrawal) {
      await supabase
        .from('crypto_withdrawals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id);
    }
  }
  
  // Handle withdrawal failure
  if (eventType === 'payout.transfer.failed' ||
      eventType === 'mobilepayment.settlement.failed') {
    const { data: withdrawal } = await supabase
      .from('crypto_withdrawals')
      .select('*')
      .eq('reference', data.reference)
      .single();
    
    if (withdrawal) {
      // Refund user
      await supabase.rpc('credit_crypto_balance', {
        p_user_id: withdrawal.user_id,
        p_amount: withdrawal.amount
      });
      
      await supabase
        .from('crypto_withdrawals')
        .update({
          status: 'failed',
          rejection_reason: 'Bank transfer failed - refunded'
        })
        .eq('id', withdrawal.id);
    }
  }
}
```

**Database Addition Needed:**
```sql
-- New table for idempotency tracking
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bitnob_transaction_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_bitnob_tx ON webhook_events(bitnob_transaction_id);
```

**Key Insights:**
1. **HMAC SHA512** signature verification is MANDATORY
2. **Always return 200** even on errors (or Bitnob retries)
3. **Idempotency** required (3 retries = potential duplicates)
4. **Async processing** recommended (don't block webhook response)
5. **Backup polling** essential (webhooks can fail)
6. **ngrok for testing** locally before deploying

**Confidence Level:** 🟢🟢🟢 CRITICAL - Security foundation is clear!

---

### Part 12 Notes (Payouts API - Transfer to Banks/Mobile Money):

**🎯 This is our WITHDRAWAL API!**

**Supported Countries:**
- ✅ **Nigeria:** NGN, Bank Transfer, ₦1,000 - ₦2,000,000
- USA: USD, ACH/Wire
- Australia: AUD, Bank Transfer
- Kenya: KES, M-pesa
- Ghana: GHS, Mobile Money
- 8+ African countries with CFA Mobile Money
- Uganda: UGX, Mobile Money
- Rwanda: RWF, Mobile Money

**Nigeria Limits (Critical for TallyStore!):**
- Minimum: ₦1,000 ($0.61 USD)
- Maximum: ₦2,000,000 ($1,220 USD) per transaction
- Method: Bank Transfer

**Payout Flow (3 Steps):**

**Step 1: Add Beneficiary** (Bank Account)
- Create beneficiary record with bank details
- Can reuse beneficiary for future payouts
- Returns `beneficiaryId`

**Step 2: Initiate Payout**
```
POST /api/v1/payouts/initiate

Required Parameters:
- amount (in CENTS!) - 50000 = ₦500.00
- sourceWalletCurrency - "NGN" or "USD" 
- reference - Our transaction reference
- customerEmail - User's email
- description - "Withdrawal to bank account"
- beneficiaryId - From Step 1
- callbackUrl - Webhook URL (optional but recommended)
```

**Step 3: Finalize Payout**
```
POST /api/v1/payouts/finalize

Required Parameter:
- transactionId - From Step 2 response
```

**Status Flow:**
```
PENDING → PROCESSING → SUCCESS
                    ↓
                  FAILED
```

**Key Insights:**

1. **Amount in Cents (Again!):**
   - ₦50,000 withdrawal = `amount: 5000000` (50,000 × 100 cents)
   - Same pattern as Offramps and crypto receiving

2. **Source Wallet Currency:**
   - `sourceWalletCurrency: "NGN"` for Nigerian payouts
   - Must match destination currency
   - Bitnob handles conversion if using USD wallet

3. **Two-Step Authorization:**
   - Initiate = Reserve funds
   - Finalize = Execute transfer
   - Gives us chance to verify before sending

4. **Beneficiary Reuse:**
   - Can save beneficiary for repeat withdrawals
   - For TallyStore: Create new beneficiary each time (user flexibility)
   - Or: Let users save bank accounts for quick withdrawals

5. **Webhook Callback:**
   - `callbackUrl` optional but HIGHLY recommended
   - Overrides default webhook URL for this specific payout
   - Use for per-transaction tracking

**For TallyStore Withdrawal Implementation:**

```typescript
// Step 1: Create Beneficiary
async function createBeneficiary(userBankDetails) {
  const response = await fetch('https://api.bitnob.co/api/v1/beneficiaries', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BITNOB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      country: 'NG',
      currency: 'NGN',
      type: 'BANK',
      bankCode: userBankDetails.bankCode,
      accountNumber: userBankDetails.accountNumber,
      accountName: userBankDetails.accountName // Optional, validated automatically
    })
  });
  
  const { data } = await response.json();
  return data.id; // beneficiaryId
}

// Step 2: Initiate Payout
async function initiatePayout(withdrawal, beneficiaryId) {
  const amountInCents = withdrawal.net_amount * 100; // ₦50,000 = 5000000
  
  const response = await fetch('https://api.bitnob.co/api/v1/payouts/initiate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BITNOB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amountInCents,
      sourceWalletCurrency: 'NGN',
      reference: withdrawal.id, // Our UUID
      customerEmail: withdrawal.user_email,
      description: `TallyStore withdrawal - ₦${withdrawal.net_amount.toLocaleString()}`,
      beneficiaryId: beneficiaryId,
      callbackUrl: `${SUPABASE_URL}/functions/v1/bitnob-webhook`
    })
  });
  
  const { data } = await response.json();
  return data.transactionId;
}

// Step 3: Finalize Payout
async function finalizePayout(transactionId) {
  const response = await fetch('https://api.bitnob.co/api/v1/payouts/finalize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BITNOB_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transactionId: transactionId
    })
  });
  
  const { data } = await response.json();
  return data; // Contains status, etc.
}

// Complete Withdrawal Flow
async function processWithdrawal(withdrawalId) {
  // 1. Get withdrawal from DB
  const withdrawal = await db.crypto_withdrawals.findById(withdrawalId);
  
  // 2. Check if requires approval (≥₦500k)
  if (withdrawal.requires_approval && !withdrawal.approved_by) {
    throw new Error('Withdrawal requires admin approval');
  }
  
  // 3. Verify user has sufficient crypto_balance
  const user = await db.profiles.findById(withdrawal.user_id);
  if (user.crypto_balance < withdrawal.amount) {
    throw new Error('Insufficient crypto balance');
  }
  
  // 4. Deduct from crypto_balance (with row locking)
  await db.deduct_crypto_balance(withdrawal.user_id, withdrawal.amount);
  
  // 5. Create beneficiary
  const beneficiaryId = await createBeneficiary({
    bankCode: withdrawal.bank_code,
    accountNumber: withdrawal.account_number,
    accountName: withdrawal.account_name
  });
  
  // 6. Initiate payout
  const transactionId = await initiatePayout(withdrawal, beneficiaryId);
  
  // 7. Update DB
  await db.crypto_withdrawals.update(withdrawalId, {
    status: 'processing',
    bitnob_transaction_id: transactionId,
    bitnob_beneficiary_id: beneficiaryId
  });
  
  // 8. Finalize payout
  await finalizePayout(transactionId);
  
  // 9. Webhook will update to SUCCESS or FAILED
  // If FAILED, webhook handler refunds user's crypto_balance
}
```

**Database Updates Needed:**
```sql
-- Add to crypto_withdrawals table
ALTER TABLE crypto_withdrawals 
ADD COLUMN IF NOT EXISTS bitnob_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS bitnob_beneficiary_id TEXT;

CREATE INDEX idx_crypto_withdrawals_bitnob_tx 
ON crypto_withdrawals(bitnob_transaction_id);
```

**Error Handling:**
```typescript
try {
  await processWithdrawal(withdrawalId);
} catch (error) {
  // Refund user if anything fails before finalization
  await db.credit_crypto_balance(withdrawal.user_id, withdrawal.amount);
  await db.crypto_withdrawals.update(withdrawalId, {
    status: 'failed',
    rejection_reason: error.message
  });
}
```

**Auto-Approval Logic:**
```typescript
async function checkWithdrawalApproval(withdrawal) {
  if (withdrawal.amount >= 500000) { // ₦500k+
    return {
      requires_approval: true,
      status: 'pending' // Wait for admin
    };
  } else {
    // Auto-approve and process
    await processWithdrawal(withdrawal.id);
    return {
      requires_approval: false,
      status: 'processing'
    };
  }
}
```

**Admin Approval Flow:**
```typescript
async function approveWithdrawal(withdrawalId, adminUserId) {
  // 1. Update as approved
  await db.crypto_withdrawals.update(withdrawalId, {
    approved_by: adminUserId,
    approved_at: new Date()
  });
  
  // 2. Process payout
  await processWithdrawal(withdrawalId);
}
```

**Key Insights:**
1. **₦1,000 - ₦2M limits** align with our ₦500k approval threshold
2. **Two-step process** gives us control and safety
3. **Beneficiary reuse** optional - can create fresh each time
4. **Webhook completes the flow** - don't poll, wait for event
5. **Amount in cents** (consistent with all Bitnob APIs)

**Confidence Level:** 🟢🟢🟢 VERY HIGH - Withdrawal flow is clear!

---

### Part 13 Notes (Authentication):

**API Key Authentication:**

**How to Get API Keys:**
1. Go to Bitnob Dashboard → Settings
2. Choose environment: Sandbox OR Production
3. Click "Generate a new key"
4. Copy and store securely

**Two Environments:**
- 🧪 **Sandbox (Test):** For development, uses testnet crypto
- 🚀 **Production (Live):** Real money, real transactions

**Authorization Header Format:**
```
Authorization: Bearer YOUR_API_KEY_HERE
```

**Example Request:**
```javascript
fetch('https://api.bitnob.co/api/v1/addresses/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_abc123xyz...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    label: 'User sell order',
    type: 'onchain'
  })
});
```

**Security Best Practices:**

1. **NEVER hardcode API keys** in source code
   ```javascript
   // ❌ BAD - hardcoded
   const API_KEY = 'sk_live_abc123...';
   
   // ✅ GOOD - environment variable
   const API_KEY = process.env.BITNOB_API_KEY;
   ```

2. **Use environment variables:**
   ```bash
   # .env (NEVER commit this file!)
   BITNOB_API_KEY_SANDBOX=sk_test_...
   BITNOB_API_KEY_LIVE=sk_live_...
   BITNOB_WEBHOOK_SECRET=whsec_...
   ```

3. **Separate test vs production:**
   - Test keys for development/staging
   - Production keys ONLY on live server
   - Different webhook URLs for each

4. **Store in Supabase Secrets:**
   ```bash
   # Supabase Edge Function secrets
   supabase secrets set BITNOB_API_KEY=sk_live_...
   supabase secrets set BITNOB_WEBHOOK_SECRET=whsec_...
   ```

5. **HTTPS ONLY:**
   - All API requests MUST use HTTPS
   - HTTP requests will be rejected
   - Webhook URLs must be HTTPS too

**API Key Formats (Observed):**
- Test keys: Likely start with `sk_test_`
- Live keys: Likely start with `sk_live_`
- Webhook secrets: Likely start with `whsec_`

**For TallyStore Implementation:**

```typescript
// supabase/functions/_shared/bitnob-client.ts
export class BitnobClient {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';
    this.apiKey = isDev 
      ? Deno.env.get('BITNOB_API_KEY_SANDBOX')!
      : Deno.env.get('BITNOB_API_KEY_LIVE')!;
    
    this.baseUrl = isDev
      ? 'https://sandboxapi.bitnob.co' // Sandbox URL (likely)
      : 'https://api.bitnob.co';        // Production URL
  }
  
  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Bitnob API Error: ${error.message}`);
    }
    
    return response.json();
  }
  
  async generateAddress(type: 'btc' | 'usdt' | 'usdc') {
    return this.request('/api/v1/addresses/generate', {
      method: 'POST',
      body: JSON.stringify({
        label: `TallyStore ${type.toUpperCase()} deposit`,
        type: 'onchain',
        crypto: type
      })
    });
  }
  
  async createBeneficiary(bankDetails: any) {
    return this.request('/api/v1/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(bankDetails)
    });
  }
  
  async initiatePayout(payoutData: any) {
    return this.request('/api/v1/payouts/initiate', {
      method: 'POST',
      body: JSON.stringify(payoutData)
    });
  }
  
  async finalizePayout(transactionId: string) {
    return this.request('/api/v1/payouts/finalize', {
      method: 'POST',
      body: JSON.stringify({ transactionId })
    });
  }
}
```

**Environment Setup:**
```bash
# Local development (.env.local)
BITNOB_API_KEY_SANDBOX=sk_test_YOUR_TEST_KEY
BITNOB_WEBHOOK_SECRET=whsec_YOUR_TEST_SECRET

# Production (Supabase secrets)
supabase secrets set BITNOB_API_KEY_LIVE=sk_live_YOUR_LIVE_KEY
supabase secrets set BITNOB_WEBHOOK_SECRET=whsec_YOUR_LIVE_SECRET
```

**Key Rotation Best Practice:**
```typescript
// Rotate keys periodically (every 90 days)
// Keep old key active for 24 hours during transition
// Update in dashboard → Update in Supabase → Deploy → Remove old key
```

**Error Handling:**
```typescript
try {
  await bitnobClient.generateAddress('btc');
} catch (error) {
  if (error.message.includes('expired')) {
    // API key expired - alert admin
    await sendAdminAlert('Bitnob API key expired!');
  } else if (error.message.includes('unauthorized')) {
    // Invalid API key
    await sendAdminAlert('Invalid Bitnob API key!');
  }
  throw error;
}
```

**Key Insights:**
1. **Bearer token format** - simple and standard
2. **Two separate keys** - test and production
3. **Environment variables** - NEVER hardcode
4. **HTTPS required** - security enforced
5. **Key expiry** - monitor and rotate
6. **Webhook secret** - separate from API key

**Confidence Level:** 🟢🟢 HIGH - Authentication is straightforward!

---

### Part 14 Notes (Development Mode - FINAL):

**🧪 Sandbox Environment:**

**How to Get Started:**
1. Sign up at sandbox platform (separate from production)
2. Get sandbox API key from dashboard
3. Use testnet/signet for testing (no real money!)

**Test Networks:**
- **Lightning:** Testnet (for Lightning transactions)
- **Bitcoin Onchain:** Signet (for BTC transactions)
- **Stablecoins:** Likely testnet USDT/USDC (need to verify)

**Free Test Crypto Faucets:**
1. **Lightning Testnet:** https://htlc.me/
   - Get free testnet Lightning BTC
   - Pay Lightning invoices generated in sandbox
   
2. **Bitcoin Signet:** https://bitcoinfaucet.uo1.net/
   - Get free signet BTC
   - Send to onchain addresses generated in sandbox

**Bitnob Community:**
- Join Slack for support during integration
- Ask questions, get help from other developers

**For TallyStore Testing Strategy:**

**Phase 1: Local Development (No Bitnob Yet)**
```typescript
// Use mock data while waiting for invitation code
const MOCK_MODE = !Deno.env.get('BITNOB_API_KEY_SANDBOX');

if (MOCK_MODE) {
  // Return fake addresses, fake webhooks
  return {
    address: 'MOCK_ADDRESS_' + Math.random(),
    chain: 'tron',
    amount: requestedAmount
  };
}
```

**Phase 2: Sandbox Testing (After Invitation Code Arrives)**
```bash
# 1. Create Bitnob sandbox account
# 2. Generate sandbox API key
# 3. Set environment variables

BITNOB_API_KEY_SANDBOX=sk_test_YOUR_KEY
BITNOB_WEBHOOK_SECRET=whsec_test_YOUR_SECRET
ENVIRONMENT=development
```

**Phase 3: Sandbox Flow Testing**
```typescript
// Test receiving crypto
async function testBitcoinReceive() {
  // 1. Generate BTC address in sandbox
  const address = await bitnob.generateAddress('btc');
  
  // 2. Go to https://bitcoinfaucet.uo1.net/
  // 3. Paste address, get free signet BTC
  // 4. Wait for webhook (should fire in 5-10 min)
  // 5. Verify crypto_balance credited correctly
}

// Test withdrawals
async function testPayout() {
  // 1. Credit test user with ₦10,000 crypto_balance
  // 2. Request withdrawal to Nigerian bank
  // 3. Verify sandbox processes payout
  // 4. Check webhook for success/failed
  // 5. Verify crypto_balance deducted
}

// Test stablecoins (TRC20)
async function testUSDTReceive() {
  // 1. Generate USDT TRC20 address
  // 2. Send testnet USDT (need faucet for this)
  // 3. Wait for webhook
  // 4. Verify credits correctly
}
```

**Testing Checklist:**

**✅ Bitcoin Receiving:**
- [ ] Generate BTC address
- [ ] Receive signet BTC from faucet
- [ ] Webhook fires with correct data
- [ ] crypto_balance credited
- [ ] Transaction marked confirmed
- [ ] 3+ confirmation tracking works

**✅ USDT Receiving (TRC20):**
- [ ] Generate USDT address
- [ ] Receive testnet USDT
- [ ] Webhook fires
- [ ] crypto_balance credited
- [ ] Amount calculation correct (with 5% markup)

**✅ Withdrawals:**
- [ ] Create withdrawal request
- [ ] Beneficiary created successfully
- [ ] Payout initiated
- [ ] Payout finalized
- [ ] Webhook confirms success
- [ ] crypto_balance deducted
- [ ] Test failed payout refund

**✅ Edge Cases:**
- [ ] Expired transactions (>15 min for quotes)
- [ ] Insufficient balance withdrawal
- [ ] ≥₦500k approval flow
- [ ] Daily limit enforcement (₦1M)
- [ ] Duplicate webhook handling
- [ ] Invalid webhook signatures
- [ ] Network errors and retries

**✅ UI Testing:**
- [ ] Crypto exchange page loads
- [ ] Live rate calculation works
- [ ] QR code displays correctly
- [ ] Countdown timer accurate
- [ ] Deposit instructions clear
- [ ] Withdrawal form validation
- [ ] Transaction history displays
- [ ] Admin approval panel works

**Phase 4: Production Deployment**
```bash
# 1. Complete all sandbox testing
# 2. Get production API key from Bitnob
# 3. Update Supabase secrets

supabase secrets set BITNOB_API_KEY_LIVE=sk_live_YOUR_KEY
supabase secrets set BITNOB_WEBHOOK_SECRET=whsec_live_YOUR_SECRET
supabase secrets set ENVIRONMENT=production

# 4. Deploy Edge Functions
# 5. Update webhook URL in Bitnob dashboard
# 6. Test with small real transaction ($5 USDT)
# 7. Monitor first 10 transactions closely
# 8. Gradually open to more users
```

**Monitoring in Production:**
```typescript
// Log all Bitnob API calls
async function logBitnobRequest(endpoint: string, data: any) {
  await supabase.from('bitnob_api_logs').insert({
    endpoint,
    request_data: data,
    timestamp: new Date().toISOString()
  });
}

// Alert on errors
async function alertOnError(error: any) {
  if (ENVIRONMENT === 'production') {
    await sendAdminEmail('Bitnob API Error', error.message);
    await sendSlackAlert('🚨 Bitnob error: ' + error.message);
  }
}
```

**Key Insights:**
1. **Separate sandbox account** - don't mix with production
2. **Free test crypto** - no cost to test
3. **Testnet/Signet networks** - safe environment
4. **Community support** - Slack for help
5. **Thorough testing required** - financial app, can't afford bugs

**Sandbox Limitations to Note:**
- Testnet crypto has no real value
- May have rate limits (same as production?)
- Payout testing might not actually send money
- Some features might behave differently

**Confidence Level:** 🟢🟢 HIGH - Testing strategy is clear!

---

## 🎉 DOCUMENTATION READING COMPLETE!

**All 14 critical docs read and analyzed!**

---

### Part 3 Notes (Initialize Quote):

**Endpoint:** `POST /api/v1/payouts/initialize`

**Request Payload:**
```json
{
  "quoteId": "QT_6156",
  "customerId": "6ae40f3c-0eb5-478e-8892-560bb547rt3d",  // Our user_id
  "country": "NG",
  "reference": "off_QT_ref-10a4",                        // Our custom reference
  "beneficiaryId": "a21b99cb-...",                       // Reuse saved beneficiary OR...
  "beneficiary": {                                        // ...provide new bank details
    "type": "BANK",                                       // "BANK" or "MOBILE_MONEY"
    "bankCode": "110072",                                 // Nigerian bank code
    "accountNumber": "1421795566"
  },
  "paymentReason": "Funds for stuff",                    // Required text
  "callbackUrl": "https://example.com/callback/id",      // ✅ WEBHOOK URL!
  "clientMetaData": {                                    // Custom tracking data
    "name": "john doe",
    "height": "194"
  }
}
```

**Key Fields:**
- `customerId` → Our `user_id` from profiles table
- `reference` → Our transaction UUID (store in DB)
- `callbackUrl` → **OUR WEBHOOK ENDPOINT** (critical!)
- `beneficiary.type` → "BANK" (we'll use this for withdrawals)
- `beneficiary.bankCode` → Nigerian bank code (need list of codes)
- `clientMetaData` → Can store user email, phone, etc. for tracking

**Sample Response:**
```json
{
  "status": true,
  "message": "OffRamp quote initialized successfully",
  "data": {
    "id": "6ae40f3c-...",
    "status": "initiated",                               // Status changes to "initiated"
    "quoteId": "QT_6156",
    "address": "TS8bXUyq2QdyYceKVxcvJpHQ6NX6qY2xaZ",    // 🚨 DEPOSIT ADDRESS!
    "chain": "trc20",
    "fromAsset": "usdt",
    "amount": 200,                                       // $200 USD
    "btcAmount": 0.00211578,                            // BTC equivalent
    "satAmount": 211578,                                 // Satoshis
    "exchangeRate": 1626.1,
    "settlementAmount": 325220,                          // ₦3,252.20 (in kobo)
    "settlementCurrency": "ngn",
    "fees": 0,                                           // No fees from Bitnob
    "reference": "off_QT_ref-10a4",
    "paymentReason": "Funds for stuff",
    "paymentETA": "3-5 minutes",                         // After deposit confirmed
    "expiryTimeStamp": 1736937230,
    "expiresInText": "This invoice expires in 15 minutes",
    "beneficiaryDetails": {
      "id": "e8455a92-...",                             // Save for reuse
      "status": "success",
      "country": "NG",
      "currency": "NGN",
      "reference": "QT_6156_86cadb25a4ac",
      "destination": {
        "type": "BANK",
        "bankCode": "000014",
        "accountName": "JANE DOE",                      // Bank returned this
        "accountNumber": "1421795566"
      }
    }
  }
}
```

**🚨 CRITICAL DISCOVERY:**
- **Address is generated here!** → Show to user with QR code
- Status = "initiated" (NOT "pending_address_deposit" yet)
- **Don't tell user to send crypto yet** - must finalize first!
- Bank returns `accountName` (validates account number)

**For TallyStore Implementation:**
- After Create Quote → Immediately Initialize Quote
- Store `address` in our DB (`deposit_address` field)
- Store `beneficiaryDetails.id` for future reuse
- **callbackUrl** = Our Edge Function webhook endpoint
- Use `clientMetaData` to store user email for notifications

---

### Part 4 Notes (Finalize Quote):

**Endpoint:** `POST /api/v1/payouts/finalize`

**Request Payload (Simple!):**
```json
{
  "quoteId": "QT_6156"
}
```

**Sample Response:**
```json
{
  "status": true,
  "message": "OffRamp quote finalized successfully",
  "data": {
    "id": "6ae40f3c-...",
    "status": "pending_address_deposit",                 // 🚨 NOW ready for payment!
    "quoteId": "QT_6156",
    "address": "TS8bXUyq2QdyYceKVxcvJpHQ6NX6qY2xaZ",    // SAME address from Initialize
    "chain": "trc20",
    "fromAsset": "usdt",
    "amount": 200,                                       // User must send EXACT amount
    "btcAmount": 0.00211578,
    "satAmount": 211578,
    "exchangeRate": 1626.1,
    "settlementAmount": 325220,
    "settlementCurrency": "ngn",
    "fees": 0,
    "reference": "off_QT_ref-10a4",
    "paymentReason": "Funds for stuff",
    "paymentETA": "3-5 minutes",
    "expiryTimeStamp": 1736937230,
    "expiresInText": "This invoice expires in 15 minutes",
    "beneficiaryDetails": { /* same as Initialize */ }
  }
}
```

**🚨 CRITICAL INSIGHTS:**
- Status changes: "initiated" → "pending_address_deposit"
- **ONLY NOW** should user send crypto to the address
- User must send **EXACT amount** (200 USDT, not 199.99 or 200.01)
- After deposit confirmed → Settlement begins (3-5 min ETA)
- Webhook will notify us of status changes

**Complete Flow:**
```
1. CREATE QUOTE
   ↓ Get rate, quoteId
   
2. INITIALIZE QUOTE (provide bank details, callbackUrl)
   ↓ Get deposit address (status = "initiated")
   ↓ DON'T show address to user yet!
   
3. FINALIZE QUOTE
   ↓ Status = "pending_address_deposit"
   ↓ NOW show address + QR code to user
   ↓ User sends crypto
   
4. WEBHOOK NOTIFICATION
   ↓ "asset_received" → Crypto confirmed on blockchain
   ↓ "completed" → NGN settled to bank account
```

---

### Part 5 Notes (Simulate Address Deposit - TESTING ONLY):

**Endpoint:** `POST /api/v1/payouts/simulate-address-deposit` (SANDBOX ONLY)

**Request Payload:**
```json
{
  "address": "TS8bXUyq2QdyYceKVxcvJpHQ6NX6qY2xaZ",
  "amount": 200                                          // EXACT amount from quote
}
```

**Response:**
```json
{
  "status": true,
  "message": "OffRamp simulate address deposit successfully",
  "data": {
    "success": true
  }
}
```

**Usage:**
- **ONLY for sandbox testing** (not available in production)
- Simulates user sending crypto to the address
- Triggers webhook as if real crypto was received
- Perfect for testing our integration without real funds!

**For TallyStore Testing:**
- In development: Use sandbox + simulate deposits
- Can test entire flow without real USDT
- Test webhook handling, status updates, etc.

---

## 🔄 NEXT STEPS

**Current:** Waiting for Part 2 (Create Quote documentation)  
**After All Docs Read:** Create comprehensive implementation plan  
**Then:** Start coding Phase 2 UI while waiting for Bitnob invitation code

---

**Last Updated:** November 6, 2025 - ✅ ALL 14 DOCS COMPLETE

**📊 Progress:** 100% complete (14/14 docs read and analyzed)

**🎯 Status:** Ready to implement!

---

## 🎉 DOCUMENTATION READING SESSION COMPLETE!

### ✅ What We Learned:

**1. RECEIVING CRYPTO (Direct API - Not Offramps):**
- Bitcoin: Generate BTC addresses → Webhook → Credit balance
- USDT TRC20: CONFIRMED SUPPORTED (webhooks show it!)
- USDC: ERC20/Polygon/BSC (TRC20 unclear)
- Webhook events: `btc.onchain.received.success`, `stablecoin.usdt.received.success`
- Wait for 3+ confirmations before crediting

**2. WITHDRAWALS (Payouts API):**
- Nigerian limits: ₦1,000 - ₦2,000,000 per transaction
- 3-step flow: Create Beneficiary → Initiate → Finalize
- Amount in cents: ₦50,000 = 5,000,000 cents
- Webhook events: `payout.transfer.success`, `payout.transfer.failed`
- Auto-refund on failed transfers

**3. SECURITY (Webhooks):**
- HMAC SHA512 signature verification (MANDATORY!)
- Always return 200 OK (even on errors)
- Idempotency required (handle duplicates)
- HTTPS only (enforced)

**4. AUTHENTICATION:**
- Bearer token: `Authorization: Bearer sk_live_...`
- Sandbox keys: `sk_test_...`
- Production keys: `sk_live_...`
- Webhook secrets: `whsec_...`
- Store in environment variables (NEVER hardcode)

**5. TESTING:**
- Sandbox environment separate from production
- Free test crypto: htlc.me (Lightning), bitcoinfaucet.uo1.net (Signet)
- Testnet for Lightning, Signet for Bitcoin onchain
- Slack community for support

---

## 🚨 KEY DISCOVERIES:

### ✅ TRON TRC20 SUPPORTED!
- Documentation was confusing, but webhooks confirm it
- USDT TRC20 definitely works (examples show `"chain": "tron"`)
- Matches client's requirement!

### ✅ PERFECT ARCHITECTURE MATCH:
- **Receiving:** Use Bitcoin/Stablecoins API (generate addresses, webhooks)
- **Withdrawals:** Use Payouts API (send to banks)
- **NOT Offramps:** That's for instant crypto→bank (we need two-step)

### ⚠️ SOLANA NOT SUPPORTED:
- Bitnob doesn't support SOL
- Still need IvoryPay for Solana later (bonus feature)

---

## 🎯 NEXT STEPS:

### **OPTION 1: START PHASE 2 UI NOW (Recommended)**
While waiting for Bitnob invitation code:
- Build crypto balance display
- Create crypto exchange page UI
- Design withdrawal form
- Use mock data for testing
- Swap to real API when keys arrive

### **OPTION 2: WAIT FOR INVITATION CODE**
Then proceed directly to full integration:
- Get sandbox API keys
- Test with free testnet crypto
- Deploy Edge Functions
- End-to-end testing

---

**WHAT DO YOU WANT TO DO?**
- **Type "START PHASE 2 UI"** - Build frontend now
- **Type "WAIT FOR KEYS"** - Pause until Bitnob account ready
- **Type "SHOW IMPLEMENTATION PLAN"** - See complete 8-phase roadmap

---

## 🎉 BREAKTHROUGH #2: TRON IS SUPPORTED!

**Documentation Confusion Resolved:**

**Stablecoins Page Said:**
- "We don't support USDC on TRON"

**Webhook Examples Show:**
- `"chain": "tron"` in multiple examples!
- USDT TRC20 webhooks exist
- USDC TRC20 webhooks exist (despite docs saying no)

**Reality:**
- ✅ **USDT TRC20** - FULLY SUPPORTED
- ⚠️ **USDC TRC20** - Webhooks exist but docs say "not supported" (need to test)
- ✅ **USDT/USDC** Ethereum/Polygon/BSC - SUPPORTED

**This means:**
- Client's TRC20 requirement CAN BE MET! (at least for USDT)
- Need to verify USDC TRC20 when account is ready
- Bitnob is back in contention!

---

## 🚨 UPDATED CLIENT REQUIREMENT STATUS

**Client Required:**
- ✅ **USDT TRC20** - SUPPORTED by Bitnob!
- ⚠️ **USDC TRC20** - Unclear (webhooks exist, docs say no)
- ❌ **SOL** - NOT SUPPORTED by Bitnob

**Recommendation:**
- Use Bitnob for BTC + USDT TRC20
- Either drop USDC TRC20 support OR test it when account ready
- Still no Solana (need IvoryPay or another provider for SOL)

---

## 🎉 BREAKTHROUGH DISCOVERY!

**SOLUTION FOUND:** Use **Bitcoin/Stablecoins Receiving** (not Offramps) for incoming payments!

**The Right Approach:**
1. **RECEIVING (Bitcoin/Stablecoins API):**
   - Generate unique address for each sell order
   - User sends crypto → Bitnob wallet
   - Webhook fires → Credit user's crypto_balance
   - No bank account needed!

2. **WITHDRAWAL (Offramps OR Payouts API):**
   - User requests withdrawal from crypto_balance
   - Use Offramps to send NGN to their bank
   - Deduct from Bitnob wallet balance
   - Update user's crypto_balance in our DB

**This matches our exact use case!** ✅

---

## 🚨 CRITICAL ISSUE DISCOVERED

~~**PROBLEM:** Bitnob's Offramps requires beneficiary (bank account) during Initialize step.~~

✅ **SOLVED:** Don't use Offramps for receiving - use direct Bitcoin/Stablecoins receiving!

**NEW APPROACH:**
- Offramps = WITHDRAWAL ONLY (crypto_balance → bank)
- Bitcoin/Stablecoins Receiving = DEPOSIT ONLY (crypto → crypto_balance)

--- (Offramps section finished!)

---

## 🎉 MAJOR INSIGHTS FROM PARTS 1-5

### ✅ Complete Offramps Flow Understood:
```
USER: "I want to sell 50 USDT for NGN"
  ↓
STEP 1: CREATE QUOTE
  - POST /api/v1/payouts/quotes
  - Send: { fromAsset: "usdt", toCurrency: "ngn", source: "onchain", chain: "trc20", amount: 5000 }
  - Receive: quoteId, exchangeRate, settlementAmount, expiryTimestamp
  - Frontend shows: "You'll receive ₦82,900" (with our 5% markup)
  ↓
STEP 2: INITIALIZE QUOTE (for WITHDRAWALS only - not for sells to crypto_balance)
  - POST /api/v1/payouts/initialize
  - Send: { quoteId, customerId, country: "NG", beneficiary: {bank details}, callbackUrl }
  - Receive: address (deposit address), status: "initiated", beneficiaryDetails
  - DON'T show address to user yet!
  ↓
STEP 3: FINALIZE QUOTE
  - POST /api/v1/payouts/finalize
  - Send: { quoteId }
  - Receive: status: "pending_address_deposit", address (same as before)
  - NOW show address + QR code to user
  - Start 15-minute countdown timer
  ↓
STEP 4: USER SENDS CRYPTO
  - User sends EXACT amount (50 USDT) to provided address
  - Blockchain confirms transaction (1-10 min depending on network)
  ↓
STEP 5: WEBHOOK NOTIFICATIONS (automatic)
  - Bitnob sends webhook: status = "asset_received" (crypto confirmed)
  - Bitnob sends webhook: status = "completed" (NGN settled to bank)
  - Our webhook handler updates DB and notifies user
```

### 🚨 CRITICAL REALIZATIONS:

**FOR SELLING CRYPTO → crypto_balance (Our Main Feature):**
- We DON'T need Initialize/Finalize for this!
- We only need Create Quote to get the address
- User sends crypto → Webhook confirms → We credit crypto_balance
- **Initialize/Finalize are for direct bank settlements** (crypto → bank directly)

**TWO DIFFERENT FLOWS:**

**Flow A: Sell Crypto → crypto_balance (What we need):**
```
1. CREATE QUOTE (get address)
2. Show address to user
3. User sends crypto
4. Webhook confirms payment
5. Credit user's crypto_balance
```

**Flow B: Withdraw crypto_balance → Bank (Also needed):**
```
1. CREATE QUOTE
2. INITIALIZE QUOTE (provide bank details)
3. FINALIZE QUOTE
4. Deduct from crypto_balance (or user sends crypto)
5. Webhook confirms settlement
```

**Wait... this doesn't make sense for our use case. Need to check Bitcoin/Stablecoins docs to understand how to RECEIVE crypto without immediate bank settlement.**

---
