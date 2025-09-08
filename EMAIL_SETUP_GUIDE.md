# TallyStore Email Template Setup Guide

## 🎯 Overview
This guide will help you customize Supabase email templates and set up the email confirmation flow for TallyStore.

## 📧 Step 1: Configure Supabase Email Templates

### Access Email Templates:
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Click on **Confirm signup** template

### Replace the Default Template:
1. Copy the contents of `email-templates/email-confirmation.html`
2. Paste it into the **Message (HTML)** field
3. Update the **Subject** to: `Confirm your email - Welcome to TallyStore! 🎉`

### Update Template Variables:
The template uses these Supabase variables:
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .SiteURL }}` - Your site URL (automatically set by Supabase)

### Configure Site URL:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://yourdomain.com` (or your production domain)
3. Add **Redirect URLs**:
   - `https://yourdomain.com/email-confirmation`
   - `http://localhost:5173/email-confirmation` (for development)

## 🔧 Step 2: Update Authentication Settings

### Email Settings:
1. Go to **Authentication** → **Settings**
2. Under **Email Auth**:
   - ✅ Enable email confirmations
   - ✅ Enable email change confirmations
   - Set confirmation URL to: `https://yourdomain.com/email-confirmation`

### Security Settings:
- Email confirmation expiry: **24 hours** (recommended)
- Enable secure email change: **Yes**

## 🎨 Step 3: Customize Email Content (Optional)

### Personalization Options:
You can customize the email template further:

1. **WhatsApp Number**: Update the WhatsApp link in the template
   ```html
   <a href="https://wa.me/YOUR_WHATSAPP_NUMBER">WhatsApp</a>
   ```

2. **Brand Colors**: Modify CSS colors to match your brand
   ```css
   /* Primary blue gradient */
   background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
   ```

3. **Features List**: Update the features list to match your offerings

4. **Footer Links**: Update footer links to match your pages

## 🚀 Step 4: Test the Email Flow

### Development Testing:
1. Start your dev server: `npm run dev`
2. Go to `/register`
3. Create a test account
4. Check your email for the confirmation
5. Click the confirmation link
6. Verify it redirects to `/email-confirmation`

### Production Testing:
1. Deploy your app with the confirmation page
2. Update Supabase Site URL to your production domain
3. Test the full flow with a real email

## 🔍 Step 5: Monitor Email Delivery

### Supabase Email Logs:
1. Go to **Authentication** → **Users**
2. Check user confirmation status
3. Monitor email delivery in logs

### Custom Email Provider (Optional):
For better deliverability, consider setting up:
- SendGrid
- Mailgun
- AWS SES

In **Authentication** → **Settings** → **SMTP Settings**

## ⚡ Key Features of the New Email:

✅ **TallyStore Branding**: Custom colors, logo, and messaging
✅ **Mobile Responsive**: Looks great on all devices  
✅ **Professional Design**: Clean, modern layout
✅ **Clear CTA**: Prominent confirmation button
✅ **Feature Highlights**: Shows value proposition
✅ **Support Information**: WhatsApp contact details
✅ **Security Notice**: Builds trust with users

## 🎯 Expected User Experience:

1. **User registers** → Gets branded confirmation email
2. **Clicks confirm** → Redirects to custom confirmation page  
3. **Sees success message** → Guided to login page
4. **Smooth onboarding** → Better user experience

## 🛠️ Troubleshooting:

### Email Not Received:
- Check spam folder
- Verify email address is correct
- Check Supabase email logs
- Ensure SMTP is configured properly

### Confirmation Link Not Working:
- Verify redirect URLs are set correctly
- Check if link has expired (24 hours)
- Ensure site URL matches your domain

### Blank Page After Confirmation:
- Verify `/email-confirmation` route is set up
- Check browser console for errors
- Ensure all components are imported correctly

---

Need help? Contact support via WhatsApp! 💬
