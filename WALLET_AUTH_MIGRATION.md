# Wallet Authentication Migration Guide

## Overview
Wallet-based authentication has been disabled in favor of Twitter session-based authentication. All access control is now based on the `role` field in user profiles, which are linked to Twitter accounts.

## What Changed

### 1. Disabled Functions
The following functions in `lib/user-identity.ts` now always return `false`:
- `hasAdminAccess(wallet)` 
- `hasCoreAccess(wallet)`
- `hasScoutAccess(wallet)`
- `hasAnyAccess(wallet)`
- `checkUserRole(wallet, roles)` - returns `{ role: null, hasAccess: false }`

### 2. New Authentication Functions
- `getRoleFromTwitterSession(twitterHandle)` - Gets role from Twitter handle
- `checkUserRoleFromSession(session, requiredRoles)` - Checks role from NextAuth session
- `checkAuth(req, requiredRoles)` - Helper for API routes (in `lib/auth-utils.ts`)

### 3. Available Roles
- `admin` - Full system access
- `core` - Core team access
- `scout` - Scout access
- `user` - Regular user
- `viewer` - View-only access
- `intern` - Intern access

## Migration Examples

### Before (Wallet-based):
```typescript
// API Route Example
export async function GET(req: NextRequest) {
  // Get wallet from cookies/headers
  const walletAddress = req.cookies.get('walletAddress')?.value;
  
  // Check role
  const roleCheck = await checkUserRole(walletAddress, ['admin', 'core']);
  
  if (!roleCheck.hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // ... rest of the code
}
```

### After (Session-based):
```typescript
// API Route Example
import { checkAuth } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  // Check authentication and role
  const authCheck = await checkAuth(req, ['admin', 'core']);
  
  if (!authCheck.authenticated) {
    return NextResponse.json({ 
      error: 'Authentication required',
      message: 'Please log in with Twitter' 
    }, { status: 401 });
  }
  
  if (!authCheck.hasAccess) {
    return NextResponse.json({ 
      error: 'Unauthorized',
      message: `Requires role: ${requiredRoles.join(', ')}`
    }, { status: 403 });
  }
  
  // Access user info
  const userHandle = authCheck.user?.twitterHandle;
  const userRole = authCheck.role;
  
  // ... rest of the code
}
```

### Quick Migration Checklist

1. **Remove wallet imports**:
   - Remove: `import { checkUserRole, hasAdminAccess, etc } from '@/lib/user-identity'`
   - Add: `import { checkAuth } from '@/lib/auth-utils'`

2. **Replace wallet retrieval**:
   - Remove: Cookie/header wallet address retrieval
   - Use: `checkAuth(req, ['required', 'roles'])`

3. **Update error responses**:
   - Add helpful messages about Twitter login requirement
   - Differentiate between 401 (not authenticated) and 403 (no permission)

4. **Update user identifiers**:
   - Replace wallet addresses with Twitter handles for user-specific operations
   - Use `authCheck.user?.twitterHandle` as the user identifier

## Managing User Roles

Roles are stored in the user's profile in Redis. To assign roles:

1. User logs in with Twitter
2. Admin assigns role via admin panel
3. Role is stored in the user's profile linked to their Twitter handle

## Testing

After migration, test that:
1. Users can log in with Twitter
2. Role-based access control works correctly
3. Wallet connection is no longer required
4. Error messages guide users to log in with Twitter 