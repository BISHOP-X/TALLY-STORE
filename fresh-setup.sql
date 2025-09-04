-- TALLY STORE - FRESH SUPABASE SETUP
-- Single script to set up everything cleanly
-- Run this in your Supabase SQL Editor

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCT GROUPS TABLE (e.g., "Instagram Accounts", "Gmail Accounts")
CREATE TABLE product_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  features JSONB DEFAULT '[]',
  stock_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. INDIVIDUAL ACCOUNTS TABLE (actual accounts for sale)
CREATE TABLE individual_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_group_id UUID REFERENCES product_groups(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  email_password TEXT,
  two_fa_code TEXT,
  additional_info JSONB DEFAULT '{}',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sold_at TIMESTAMP WITH TIME ZONE
);

-- 5. ORDERS TABLE
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  account_id UUID REFERENCES individual_accounts(id),
  product_group_id UUID REFERENCES product_groups(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'refunded')),
  account_details JSONB, -- Store the account details when purchased
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TRANSACTIONS TABLE (wallet history)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('topup', 'purchase', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference TEXT UNIQUE,
  ercas_reference TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES (Simple and clean)

-- Profiles: Users can see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Orders: Users can see their own orders
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);

-- Transactions: Users can see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

-- Public tables (categories, product_groups, available accounts) - everyone can read
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view product groups" ON product_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can view available accounts" ON individual_accounts FOR SELECT USING (status = 'available');

-- Admin policies (users with is_admin = true can manage everything)
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can manage product groups" ON product_groups FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can manage individual accounts" ON individual_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 9. CREATE PROFILE ON SIGNUP (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. SAMPLE DATA (Categories and Product Groups)
INSERT INTO categories (name, description) VALUES
('Gmail', 'Gmail account credentials'),
('Instagram', 'Instagram account credentials'),
('Facebook', 'Facebook account credentials'),
('TikTok', 'TikTok account credentials'),
('Twitter', 'Twitter account credentials');

-- Get category IDs for sample product groups
DO $$
DECLARE
    gmail_id UUID;
    instagram_id UUID;
    facebook_id UUID;
BEGIN
    SELECT id INTO gmail_id FROM categories WHERE name = 'Gmail';
    SELECT id INTO instagram_id FROM categories WHERE name = 'Instagram';
    SELECT id INTO facebook_id FROM categories WHERE name = 'Facebook';

    INSERT INTO product_groups (category_id, name, description, price, features) VALUES
    (gmail_id, 'Gmail Accounts - Basic', 'Fresh Gmail accounts with phone verification', 1500.00, 
     '["Phone verified", "Fresh accounts", "Clean history", "Email access included"]'),
    (gmail_id, 'Gmail Accounts - Premium', 'Aged Gmail accounts with full access', 2500.00, 
     '["Aged accounts (6+ months)", "Phone verified", "Recovery email included", "Full access"]'),
    (instagram_id, 'Instagram Personal', 'Personal Instagram accounts ready for use', 3000.00, 
     '["Email access included", "Phone verified", "Clean reputation", "Ready for content"]'),
    (instagram_id, 'Instagram Business', 'Business Instagram accounts with followers', 5000.00, 
     '["Business account", "1K+ followers", "Engagement ready", "Monetization eligible"]'),
    (facebook_id, 'Facebook Accounts', 'Verified Facebook accounts', 2000.00, 
     '["Phone verified", "Email access", "Clean profile", "Ready to use"]');
END $$;

-- 11. CREATE ADMIN USER (UPDATE THIS EMAIL TO YOUR EMAIL)
-- IMPORTANT: Change this email to your actual admin email
-- After running this script, you can login with this email and set is_admin = true manually

-- 12. FUNCTIONS FOR EASIER OPERATIONS

-- Function to update stock count when accounts are added/sold
CREATE OR REPLACE FUNCTION update_stock_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'available' THEN
        UPDATE product_groups 
        SET stock_count = stock_count + 1 
        WHERE id = NEW.product_group_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'available' AND NEW.status = 'sold' THEN
        UPDATE product_groups 
        SET stock_count = stock_count - 1 
        WHERE id = NEW.product_group_id;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'available' THEN
        UPDATE product_groups 
        SET stock_count = stock_count - 1 
        WHERE id = OLD.product_group_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update stock counts
CREATE TRIGGER update_stock_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON individual_accounts
    FOR EACH ROW EXECUTE FUNCTION update_stock_count();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance(
    user_id UUID,
    amount DECIMAL(10,2),
    transaction_type TEXT,
    description TEXT DEFAULT '',
    reference TEXT DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    new_balance DECIMAL(10,2);
BEGIN
    -- Update the balance
    UPDATE profiles 
    SET wallet_balance = wallet_balance + amount,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Get the new balance
    SELECT wallet_balance INTO new_balance 
    FROM profiles 
    WHERE id = user_id;
    
    -- Record the transaction
    INSERT INTO transactions (user_id, type, amount, balance_after, description, reference)
    VALUES (user_id, transaction_type, amount, new_balance, description, reference);
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SUCCESS MESSAGE
SELECT 'TALLY STORE DATABASE SETUP COMPLETE! 🎉' as status,
       'You can now test the connection in your React app' as message;
