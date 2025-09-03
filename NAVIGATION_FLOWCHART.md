# TallyStore Navigation Flowchart & User Journey

## 🗺️ Site Structure & Access Control

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   LANDING PAGE (/)                             │
│                              [ALWAYS ACCESSIBLE]                                │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │   Hero Section  │  │  How It Works   │  │   Services      │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
│                                                                                 │
│  Actions Available:                                                             │
│  • Browse Products (Public)                                                    │
│  • View Web Services (Public)                                                  │
│  • Sign Up / Login                                                             │
│  • Contact/Support                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
        ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
        │  GUEST BROWSING │   │  AUTHENTICATION │   │  STATIC PAGES   │
        │   [NO LOGIN]    │   │   [REQUIRED]    │   │    [PUBLIC]     │
        └─────────────────┘   └─────────────────┘   └─────────────────┘
                │                       │                       │
                ▼                       ▼                       ▼
```

## 📊 USER JOURNEY FLOWS

### 1. 🔓 **GUEST USER FLOW** (No Authentication Required)
```
Landing Page (/)
    │
    ├─► Products Page (/products) ──────► Category Pages (/category/:id)
    │       │                                   │
    │       └─► Product Detail (/product/:id) ──┘
    │               │
    │               └─► [PURCHASE ATTEMPT] ──► Login Required Modal
    │                                             │
    │                                             └─► Register/Login Pages
    │
    ├─► Web Services (/web-services) [Contact Form Available]
    │
    ├─► Support (/support) [FAQ & Contact]
    │
    └─► Static Pages:
            ├─► About (/about)
            ├─► Contact (/contact)
            ├─► Terms (/terms)
            └─► Privacy (/privacy)
```

### 2. 🔐 **AUTHENTICATION FLOW**
```
Guest User Attempts Protected Action
    │
    ├─► Login Page (/login)
    │       │
    │       ├─► [SUCCESS] ──► Redirect to Intended Page
    │       │                   │
    │       │                   └─► Dashboard (Default)
    │       │
    │       └─► [FORGOT PASSWORD] ──► Password Reset Flow
    │
    └─► Register Page (/register)
            │
            ├─► [SUCCESS] ──► Email Verification Required
            │                   │
            │                   └─► Dashboard (Auto-login)
            │
            └─► [EXISTING USER] ──► Redirect to Login
```

### 3. 👤 **AUTHENTICATED USER FLOW** (Regular User)
```
Login Success
    │
    └─► Dashboard (/dashboard) [USER HOMEPAGE]
            │
            ├─► Profile (/profile) [Account Settings]
            │
            ├─► Wallet (/wallet) [Balance, Top-up, History]
            │       │
            │       └─► [LOW BALANCE] ──► Top-up Required Modal
            │
            ├─► Shopping Flow:
            │   │
            │   ├─► Products (/products) ──► Product Detail (/product/:id)
            │   │                               │
            │   │                               └─► Checkout (/checkout)
            │   │                                       │
            │   │                                       ├─► [SUFFICIENT BALANCE] ──► Purchase Success
            │   │                                       └─► [INSUFFICIENT BALANCE] ──► Wallet Top-up
            │   │
            │   └─► Category Pages (/category/:id) ──► Product Detail
            │
            ├─► Order History (/orders) [Past Purchases]
            │       │
            │       └─► Order Details [Account delivery info]
            │
            └─► Account Actions:
                ├─► Profile Settings
                ├─► Password Change
                └─► Logout ──► Landing Page
```

### 4. 👑 **ADMIN USER FLOW** (Administrative Access)
```
Admin Login (/login with admin credentials)
    │
    └─► Admin Dashboard (/admin) [ADMIN HOMEPAGE]
            │
            ├─► User Management:
            │   ├─► View All Users
            │   ├─► User Account Details
            │   └─► Suspend/Activate Users
            │
            ├─► Product Management:
            │   ├─► Add New Products
            │   ├─► Edit Existing Products
            │   ├─► Delete Products
            │   └─► Manage Categories
            │
            ├─► Order Management:
            │   ├─► View All Orders
            │   ├─► Process Orders
            │   ├─► Mark as Delivered
            │   └─► Refund Management
            │
            ├─► Financial Overview:
            │   ├─► Revenue Analytics
            │   ├─► Transaction History
            │   └─► Wallet Management
            │
            └─► Site Management:
                ├─► Content Management
                ├─► Support Tickets
                └─► System Settings
```

## 🚪 ACCESS CONTROL MATRIX

| Page | Guest | User | Admin | Trigger/Condition |
|------|-------|------|-------|-------------------|
| **Landing (/)** | ✅ | ✅ | ✅ | Always accessible |
| **Products** | ✅ | ✅ | ✅ | Browse only for guests |
| **Product Detail** | ✅ | ✅ | ✅ | Purchase requires login |
| **Category Pages** | ✅ | ✅ | ✅ | Browse only for guests |
| **Web Services** | ✅ | ✅ | ✅ | Contact form available |
| **Support/FAQ** | ✅ | ✅ | ✅ | Always accessible |
| **About/Contact/Terms/Privacy** | ✅ | ✅ | ✅ | Static pages |
| **Login/Register** | ✅ | ❌* | ❌* | *Redirects if logged in |
| **Dashboard** | ❌ | ✅ | ❌ | User homepage |
| **Profile** | ❌ | ✅ | ✅ | Account settings |
| **Wallet** | ❌ | ✅ | ❌ | User financial management |
| **Checkout** | ❌ | ✅ | ✅ | Requires item in cart |
| **Order History** | ❌ | ✅ | ✅ | Purchase history |
| **Admin Panel** | ❌ | ❌ | ✅ | Admin role required |

## 🔄 NAVIGATION TRIGGERS

### **Redirect Scenarios:**
1. **Guest tries to purchase** → Login page → Back to product after login
2. **Guest tries protected page** → Login page → Dashboard after login
3. **Logged user visits auth pages** → Dashboard (prevent re-login)
4. **Low wallet balance at checkout** → Wallet top-up → Back to checkout
5. **Admin logs in** → Admin dashboard (not user dashboard)
6. **Session expires** → Login page with session expired message

### **Modal/Popup Triggers:**
1. **Purchase without login** → Login required modal
2. **Insufficient balance** → Top-up wallet modal
3. **Email verification needed** → Check email modal
4. **Account suspended** → Contact support modal

## 🎯 USER INTENT MAPPING

### **First-Time Visitor:**
```
Landing → Browse Products → View Details → Register → Dashboard → Purchase
```

### **Returning Customer:**
```
Landing → Login → Dashboard → Browse → Purchase → Order History
```

### **Window Shopper:**
```
Landing → Browse Products → Categories → Product Details → [Leave or Register]
```

### **Administrator:**
```
Direct Login → Admin Dashboard → Manage Content → Process Orders
```

## 🔧 IMPLEMENTATION NOTES

### **Protected Route Logic:**
- Check authentication status
- Verify user role (user vs admin)
- Store intended destination for post-login redirect
- Show appropriate error messages

### **Progressive Disclosure:**
- Hide purchase buttons for guests
- Show wallet balance only for users
- Display admin menu only for admins
- Reveal features based on user status

### **State Management:**
- Track user authentication
- Store cart/checkout state
- Remember intended navigation
- Manage session persistence
```

This flowchart shows the complete user journey and access control structure. Each page has specific entry points and conditions. Would you like me to adjust any part of this flow or implement the actual access controls in the code?
