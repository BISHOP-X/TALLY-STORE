-- Sample accounts for testing purchase system
-- Run this in Supabase SQL Editor after the main setup

-- Sample Instagram accounts
INSERT INTO individual_accounts (product_group_id, username, password, email, email_password, two_fa_code, additional_info) VALUES
-- Get Instagram Personal product group ID and insert accounts
((SELECT id FROM product_groups WHERE name = 'Instagram Personal'), 'insta_user_001', 'InstaPass123!', 'insta001@tempmail.com', 'EmailPass456!', 'ABCD1234', '{"followers": "5.2K", "posts": 89, "verified": false}'),
((SELECT id FROM product_groups WHERE name = 'Instagram Personal'), 'insta_user_002', 'InstaPass789!', 'insta002@tempmail.com', 'EmailPass321!', 'EFGH5678', '{"followers": "8.1K", "posts": 145, "verified": false}'),
((SELECT id FROM product_groups WHERE name = 'Instagram Personal'), 'insta_user_003', 'InstaPass456!', 'insta003@tempmail.com', 'EmailPass789!', 'IJKL9012', '{"followers": "12.3K", "posts": 203, "verified": true}'),

-- Instagram Business accounts  
((SELECT id FROM product_groups WHERE name = 'Instagram Business'), 'insta_biz_001', 'BizPass123!', 'instabiz001@tempmail.com', 'BizEmail456!', 'MNOP3456', '{"followers": "25.8K", "posts": 312, "verified": true, "business_category": "Lifestyle"}'),
((SELECT id FROM product_groups WHERE name = 'Instagram Business'), 'insta_biz_002', 'BizPass789!', 'instabiz002@tempmail.com', 'BizEmail321!', 'QRST7890', '{"followers": "31.2K", "posts": 428, "verified": true, "business_category": "Fashion"}'),

-- Gmail Basic accounts
((SELECT id FROM product_groups WHERE name = 'Gmail Accounts - Basic'), 'gmailuser001', 'GmailPass123!', 'gmailuser001@gmail.com', 'GmailPass123!', null, '{"created": "2024-01-15", "recovery_phone": "+1234567890"}'),
((SELECT id FROM product_groups WHERE name = 'Gmail Accounts - Basic'), 'gmailuser002', 'GmailPass456!', 'gmailuser002@gmail.com', 'GmailPass456!', null, '{"created": "2024-02-20", "recovery_phone": "+1987654321"}'),
((SELECT id FROM product_groups WHERE name = 'Gmail Accounts - Basic'), 'gmailuser003', 'GmailPass789!', 'gmailuser003@gmail.com', 'GmailPass789!', null, '{"created": "2024-03-10", "recovery_phone": "+1122334455"}'),

-- Gmail Premium accounts
((SELECT id FROM product_groups WHERE name = 'Gmail Accounts - Premium'), 'premiumgmail001', 'PremiumPass123!', 'premiumgmail001@gmail.com', 'PremiumPass123!', null, '{"created": "2023-06-15", "aged_months": 8, "recovery_email": "backup001@outlook.com"}'),
((SELECT id FROM product_groups WHERE name = 'Gmail Accounts - Premium'), 'premiumgmail002', 'PremiumPass456!', 'premiumgmail002@gmail.com', 'PremiumPass456!', null, '{"created": "2023-04-20", "aged_months": 10, "recovery_email": "backup002@outlook.com"}'),

-- Facebook accounts
((SELECT id FROM product_groups WHERE name = 'Facebook Accounts'), 'facebook_user001', 'FbPass123!', 'fbuser001@tempmail.com', 'FbEmail456!', null, '{"friends": 892, "profile_complete": true, "verified_phone": true}'),
((SELECT id FROM product_groups WHERE name = 'Facebook Accounts'), 'facebook_user002', 'FbPass789!', 'fbuser002@tempmail.com', 'FbEmail321!', null, '{"friends": 1247, "profile_complete": true, "verified_phone": true}');

-- Update stock counts after inserting accounts
UPDATE product_groups SET stock_count = (
  SELECT COUNT(*) FROM individual_accounts 
  WHERE product_group_id = product_groups.id AND status = 'available'
);

SELECT 'Sample accounts added successfully! 🎉' as status;
