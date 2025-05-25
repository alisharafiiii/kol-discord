import { NextRequest, NextResponse } from 'next/server';
import { rebuildProjectIndexes } from '@/lib/project';
import { checkUserRole } from '@/lib/user-identity';

export async function POST(req: NextRequest) {
  try {
    // Get wallet from request cookies or custom header
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    // Only admin and core users can rebuild indexes
    if (!walletAddress) {
      console.error('Rebuild indexes failed: No wallet address in cookies or headers');
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    const roleCheck = await checkUserRole(walletAddress, ['admin', 'core']);
    
    if (!roleCheck.hasAccess) {
      console.error(`Rebuild indexes failed: User with wallet ${walletAddress} is not authorized. Role: ${roleCheck.role || 'none'}`);
      return NextResponse.json({ error: 'Unauthorized. Admin or Core role required.' }, { status: 403 });
    }
    
    // Rebuild all project indexes
    await rebuildProjectIndexes();
    
    return NextResponse.json({ 
      success: true,
      message: 'Project indexes rebuilt successfully'
    });
  } catch (error) {
    console.error('Error rebuilding project indexes:', error);
    return NextResponse.json({ 
      error: 'Failed to rebuild project indexes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 