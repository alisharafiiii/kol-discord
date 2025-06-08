import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkUserRoleFromSession } from './user-identity';

/**
 * Check if the current request has valid authentication and required role
 * @param req - The NextRequest object
 * @param requiredRoles - Array of roles that provide access (default: ['admin'])
 * @returns Object with user info, role, and hasAccess
 */
export async function checkAuth(req: Request, requiredRoles: string[] = ['admin']) {
  try {
    // Get the session from NextAuth
    const session: any = await getServerSession(authOptions as any);
    
    if (!session?.twitterHandle) {
      console.log('No authenticated Twitter session found');
      return {
        authenticated: false,
        user: null,
        role: null,
        hasAccess: false,
        error: 'No authenticated session'
      };
    }
    
    // Check the user's role based on their Twitter handle
    const roleCheck = await checkUserRoleFromSession(session, requiredRoles);
    
    return {
      authenticated: true,
      user: {
        twitterHandle: session.twitterHandle,
        name: session.user?.name,
        image: session.user?.image
      },
      role: roleCheck.role,
      hasAccess: roleCheck.hasAccess,
      error: roleCheck.hasAccess ? null : 'Insufficient permissions'
    };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return {
      authenticated: false,
      user: null,
      role: null,
      hasAccess: false,
      error: 'Authentication check failed'
    };
  }
}

/**
 * Helper to ensure request has required role
 * Throws an error response if access is denied
 */
export async function requireAuth(req: Request, requiredRoles: string[] = ['admin']) {
  const authCheck = await checkAuth(req, requiredRoles);
  
  if (!authCheck.authenticated) {
    return new Response(
      JSON.stringify({ 
        error: 'Authentication required',
        message: 'Please log in with Twitter to access this resource'
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (!authCheck.hasAccess) {
    return new Response(
      JSON.stringify({ 
        error: 'Access denied',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
        currentRole: authCheck.role
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return null; // Access granted
} 