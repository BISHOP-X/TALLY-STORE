# Webhook Setup Instructions

## 🚀 Deploy Webhook to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy the project**:
   ```bash
   vercel --prod
   ```

3. **Get your webhook URL**:
   After deployment, your webhook will be available at:
   ```
   https://your-project-name.vercel.app/api/webhook/ercas
   ```

## ⚙️ Configure Webhook in Ercas Pay Dashboard

1. **Login to ErcasPay dashboard**
2. **Navigate to Settings**
3. **Click on API Keys & Webhook**
4. **Enter your webhook URL**:
   ```
   https://your-project-name.vercel.app/api/webhook/ercas
   ```

## 🧪 Test Webhook

After setup, webhooks will handle payment processing automatically:

- ✅ **No more race conditions**
- ✅ **Instant payment processing**  
- ✅ **Reliable duplicate prevention**
- ✅ **No client-side polling needed**

## 🔍 Monitor Webhook

Check Vercel Function logs to see webhook activity:
```bash
vercel logs --follow
```

## 🔧 Environment Variables

Make sure these are set in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🎯 How It Works

1. User initiates payment → Ercas Pay checkout
2. User completes payment → Ercas sends webhook to our endpoint
3. Webhook processes payment → Updates wallet + records transaction
4. User returns to app → Sees updated balance immediately

**No polling, no race conditions, no duplicates!** 🎉
