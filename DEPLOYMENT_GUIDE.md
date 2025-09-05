# Environment Variables for Vercel Deployment

## 🔧 Required Environment Variables

Add these to your Vercel dashboard (Settings → Environment Variables):

### **1. Supabase Configuration**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **2. Ercas Pay Configuration**
```
VITE_ERCASPAY_SECRET_KEY=your_ercas_pay_secret_key
```

## 🚀 Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add webhook system and streamlined profile page"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to Vercel Dashboard
   - Import your GitHub repository
   - Add environment variables above
   - Deploy

3. **Configure Webhook URL**:
   - After deployment, get your Vercel URL
   - Add webhook URL to Ercas Pay dashboard:
   ```
   https://your-app-name.vercel.app/api/webhook/ercas
   ```

## 🎯 What This Deployment Includes

✅ **Webhook system** for real-time payment processing
✅ **Enhanced duplicate prevention** with transaction history validation  
✅ **Streamlined profile page** with real data sources
✅ **Fixed transaction recording** with proper status fields
✅ **Production-ready payment flow**

## 🔍 Testing After Deployment

1. Test wallet top-up with small amount
2. Check Vercel function logs for webhook activity
3. Verify transaction appears in database
4. Confirm wallet balance updates correctly

**No more payment doubling issues!** 🎉
