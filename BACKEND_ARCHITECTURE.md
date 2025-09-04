# TallyStore Backend Architecture Breakdown

## 🏗️ **SUPABASE DATABASE STRUCTURE**

### **Core Tables:**

#### 1. **Categories Table**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- 'instagram', 'facebook', 'tiktok', etc.
  display_name VARCHAR(100) NOT NULL, -- 'Instagram', 'Facebook', 'TikTok'
  description TEXT,
  icon_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. **Product Groups Table** (Main Product Categories)
```sql
CREATE TABLE product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- 'Facebook 8-15 Years, USA'
  description TEXT,
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'instagram', etc.
  age_range VARCHAR(50), -- '8-15 years', '5-10 years'
  country VARCHAR(100), -- 'USA', 'UK', 'Global'
  gender VARCHAR(20), -- 'male', 'female', 'mixed'
  followers_range VARCHAR(50), -- '1K-5K', '10K-50K'
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_stock INTEGER DEFAULT 0,
  available_stock INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  features JSONB, -- JSON array of features like ['Verified', 'Active', 'Aged']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. **Individual Accounts Table** (CSV Import Data)
```sql
CREATE TABLE individual_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_group_id UUID REFERENCES product_groups(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  password VARCHAR(255),
  phone VARCHAR(50),
  recovery_email VARCHAR(255),
  followers_count INTEGER,
  posts_count INTEGER,
  account_age_days INTEGER,
  verification_status VARCHAR(50), -- 'verified', 'unverified'
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'sold', 'reserved'
  additional_data JSONB, -- Any extra CSV columns
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. **Users Table** (Extends Supabase Auth)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user', -- 'user', 'admin'
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. **Orders Table**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  product_group_id UUID REFERENCES product_groups(id),
  individual_account_id UUID REFERENCES individual_accounts(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'delivered', 'refunded'
  payment_method VARCHAR(50), -- 'wallet', 'card', 'crypto'
  delivery_method VARCHAR(50) DEFAULT 'email', -- 'email', 'download'
  account_details JSONB, -- Store delivered account info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);
```

#### 6. **Wallet Transactions Table**
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'purchase', 'refund'
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- Link to order or other transaction
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔧 **BACKEND FUNCTIONALITY BREAKDOWN**

### **Admin Functions:**

#### **1. Category Management**
```typescript
// Admin can add/edit/delete categories
- createCategory(name, displayName, description, iconUrl)
- updateCategory(id, data)
- deleteCategory(id)
- listCategories()
```

#### **2. Product Group Management**
```typescript
// Admin creates product groups (what users see)
- createProductGroup({
    categoryId,
    name: "Facebook 8-15 Years, USA",
    platform: "facebook",
    ageRange: "8-15 years",
    country: "USA",
    pricePerUnit: 25.00,
    features: ["Verified", "Active", "Aged"]
  })
- updateProductGroup(id, data)
- deleteProductGroup(id)
```

#### **3. CSV Upload & Processing**
```typescript
// Admin uploads CSV files for individual accounts
- uploadAccountsCSV(productGroupId, csvFile)
- processCSV(csvData) {
    // Parse CSV columns: username, email, password, phone, followers, etc.
    // Create individual_accounts records
    // Update product_group stock counts
    // Validate data integrity
  }
- bulkImportAccounts(productGroupId, accountsArray)
```

#### **4. Inventory Management**
```typescript
- getStockSummary() // Overview of all product groups and stock
- adjustStock(productGroupId, adjustment, reason)
- reserveAccounts(productGroupId, quantity) // For pending orders
- releaseReservedAccounts(productGroupId, quantity)
```

### **Customer Functions:**

#### **1. Product Browsing**
```typescript
- getProductsByCategory(categoryId, filters, pagination)
- searchProducts(query, filters)
- getProductGroupDetails(productGroupId)
- checkStockAvailability(productGroupId, quantity)
```

#### **2. Purchase Flow**
```typescript
- addToCart(productGroupId, quantity)
- validatePurchase(userId, productGroupId, quantity)
- processOrder(userId, cartItems, paymentMethod)
- allocateAccounts(orderId) // Assign specific accounts to order
- deliverAccounts(orderId) // Send account details to customer
```

#### **3. Wallet System**
```typescript
- getWalletBalance(userId)
- addFunds(userId, amount, paymentMethod)
- deductFunds(userId, amount, description, referenceId)
- getTransactionHistory(userId, pagination)
```

---

## 📊 **KEY BUSINESS LOGIC**

### **Stock Management Flow:**
1. **Admin uploads CSV** → Individual accounts created → Stock count updated
2. **Customer purchases** → Accounts reserved → Payment processed → Accounts allocated
3. **Delivery** → Account details sent → Stock decremented → Order completed

### **Product Display Logic:**
```typescript
// Frontend shows grouped products like:
"Facebook 8-15 Years, USA - 18 in stock"

// Backend aggregates:
SELECT 
  pg.*,
  COUNT(ia.id) as available_stock
FROM product_groups pg
LEFT JOIN individual_accounts ia ON ia.product_group_id = pg.id 
  AND ia.status = 'available'
WHERE pg.category_id = $categoryId
GROUP BY pg.id
```

### **Purchase Allocation:**
```typescript
// When customer buys "Facebook 8-15 Years, USA" x3:
1. Reserve 3 accounts from individual_accounts pool
2. Process payment
3. Update account status to 'sold'
4. Send account details via email
5. Update product_group available_stock count
```

---

## 🚀 **API ENDPOINTS STRUCTURE**

### **Admin APIs:**
```
POST   /api/admin/categories
GET    /api/admin/categories
PUT    /api/admin/categories/:id
DELETE /api/admin/categories/:id

POST   /api/admin/product-groups
PUT    /api/admin/product-groups/:id
DELETE /api/admin/product-groups/:id

POST   /api/admin/upload-csv/:productGroupId
GET    /api/admin/inventory/summary
POST   /api/admin/inventory/adjust-stock

GET    /api/admin/orders
PUT    /api/admin/orders/:id/status
GET    /api/admin/analytics/sales
```

### **Customer APIs:**
```
GET    /api/categories
GET    /api/products?category=:id&filters={}
GET    /api/products/:id
POST   /api/cart/add
POST   /api/orders/create
GET    /api/orders/history
GET    /api/wallet/balance
POST   /api/wallet/add-funds
GET    /api/wallet/transactions
```

---

## 🔐 **SECURITY & PERMISSIONS**

### **Row Level Security (RLS):**
```sql
-- Users can only see their own data
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT USING (auth.uid() = id);

-- Orders are user-specific
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON orders
FOR SELECT USING (auth.uid() = user_id);

-- Admin access to everything
CREATE POLICY "Admins can manage all data" ON product_groups
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## 📈 **IMPLEMENTATION PRIORITY**

### **Phase 1: Core Backend**
1. ✅ Set up Supabase project
2. ✅ Create database tables
3. ✅ Set up authentication
4. ✅ Implement RLS policies

### **Phase 2: Admin Functionality**
1. Category management
2. Product group creation
3. CSV upload system
4. Basic inventory tracking

### **Phase 3: Customer Features**
1. Product browsing with stock
2. Wallet system
3. Purchase flow
4. Order management

### **Phase 4: Advanced Features**
1. Analytics dashboard
2. Automated email delivery
3. Payment gateway integration
4. Advanced inventory management

---

This backend structure will support:
- ✅ **Grouped product display** (Facebook 8-15 Years, USA - 18 in stock)
- ✅ **CSV uploads** that populate individual accounts
- ✅ **Real-time stock management**
- ✅ **Admin product/category management**
- ✅ **Seamless customer purchase flow**
- ✅ **Proper inventory allocation and delivery**

**Ready to implement this backend structure?**
