import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { checkUserRole, findUserByUsername } from '@/lib/user-identity';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

// Helper to verify that the current request is coming from an admin
async function verifyAdmin(req: NextRequest): Promise<{ ok: boolean; error?: string }> {
  // 1. Try Twitter-based admin via session
  try {
    const session: any = await getServerSession(authOptions as any);
    if (session?.user) {
      const handle = session.twitterHandle || session.user.name;
      if (handle) {
        const norm = handle.replace('@', '').toLowerCase();
        const user = await findUserByUsername(norm);
        if (user?.role === 'admin') {
          return { ok: true };
        }
      }
    }
  } catch (e) {
    // ignore session errors – we'll fall back to wallet auth
  }

  // 2. Fallback: wallet admin (legacy)
  const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
  const walletFromHeader = req.headers.get('X-Wallet-Address');
  const walletAddress = walletFromCookie || walletFromHeader;
  if (!walletAddress) return { ok: false, error: 'No wallet' };
  const roleCheck = await checkUserRole(walletAddress, ['admin']);
  if (roleCheck.hasAccess) return { ok: true };

  return { ok: false, error: 'Unauthorized' };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 403 });
  }
  try {
    // get all users with twitterHandle
    const keys = await redis.keys('user:*');
    const pipeline = redis.pipeline();
    keys.forEach(k => pipeline.json.get(k));
    const users = (await pipeline.exec()).filter(Boolean);
    const dedupMap = new Map<string, { handle: string; role: string; profileImage?: string }>();
    users.forEach((u: any) => {
      if (!u?.twitterHandle) return;
      const handle = typeof u.twitterHandle === 'string' ? u.twitterHandle.trim() : '';
      if (!handle) return;
      if (!dedupMap.has(handle)) {
        dedupMap.set(handle, {
          handle,
          role: u.role || 'viewer',
          profileImage: u.profileImageUrl
        });
      }
    });
    return NextResponse.json({ users: Array.from(dedupMap.values()) });
  } catch(err){
    console.error(err);
    return NextResponse.json({ error:'internal'},{status:500});
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { handle, role } = body;
    if (!handle || !role) return NextResponse.json({ error:'handle and role required'},{status:400});
    
    // Update role
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    const user = await findUserByUsername(normalizedHandle);
    
    if (!user) {
      // Create new user if they don't exist
      console.log(`Creating new user for Twitter handle: ${handle}`);
      const newUserData = {
        twitterHandle: handle.startsWith('@') ? handle : `@${handle}`,
        name: handle,
        role: role,
        approvalStatus: 'approved' as const,
        createdAt: new Date().toISOString(),
        walletAddresses: {}
      };
      
      // Create user ID
      const userId = `twitter_${normalizedHandle}`;
      
      // Save to Redis
      await redis.json.set(`user:${userId}`, '$', JSON.parse(JSON.stringify({
        id: userId,
        ...newUserData,
        updatedAt: new Date().toISOString()
      })));
      
      // Create username index
      await redis.sadd(`idx:username:${normalizedHandle}`, userId);
      
      // Add to approval status index
      await redis.sadd(`idx:status:approved`, userId);
      
      return NextResponse.json({ 
        success: true, 
        message: `Created and updated new user ${handle} with role ${role}` 
      });
    } else {
      // Update existing user
      const updatedUser = {
        ...user,
        role: role,
        approvalStatus: 'approved' as const,
        updatedAt: new Date().toISOString()
      };
      
      await redis.json.set(`user:${user.id}`, '$', JSON.parse(JSON.stringify(updatedUser)));
      
      // Update approval status index
      await redis.srem(`idx:status:pending`, user.id);
      await redis.srem(`idx:status:rejected`, user.id);
      await redis.sadd(`idx:status:approved`, user.id);
      
      return NextResponse.json({ 
        success: true, 
        message: `Updated existing user ${handle} with role ${role}` 
      });
    }
  }catch(err){
    console.error('Error updating Twitter role:', err);
    return NextResponse.json({ error:'internal'},{status:500});
  }
} 