import { NextRequest, NextResponse } from 'next/server';
import { rebuildProjectIndexes } from '@/lib/project';
import { checkUserRole } from '@/lib/user-identity';

export async function POST(req: NextRequest) {
  try {
    // Check admin authorization
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    const roleCheck = await checkUserRole(walletAddress, ['admin']);
    if (!roleCheck.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }
    
    console.log(`Admin ${walletAddress} initiated project index rebuild`);
    
    // Rebuild project indexes
    await rebuildProjectIndexes();
    
    console.log('Project indexes rebuilt successfully');
    
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