# Azurite_NFT Role Fix Summary

## Issues Reported
1. **403 Error** when trying to add links in KOL campaign page
2. **Can't see edit profile button** for KOL profiles in campaign page

## Root Cause
- User had role `'user'` instead of `'core'` in the database
- JWT token was caching the old role value

## Fix Applied
- Updated user role from `'user'` to `'core'` in Redis
- User ID: `user:twitter_azurite_nft`

## Solution
User needs to:
1. **Log out completely**
2. **Log back in with Twitter**
3. This will refresh their JWT token with the correct role

## After Re-login
✅ Can add/edit links in KOL campaigns (no more 403 errors)
✅ Has full core permissions
✅ Can see edit profile button (for KOLs with user accounts)

## Technical Notes
- JWT tokens cache user roles for performance
- Role changes require re-authentication to take effect
- Edit profile button requires both:
  - User has admin/core role
  - KOL has a user account in the system 