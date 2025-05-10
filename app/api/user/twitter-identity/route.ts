import { NextRequest, NextResponse } from 'next/server';
import { identifyUser } from '@/lib/user-identity';

/**
 * API endpoint to handle Twitter-based identity management
 * This will find or create a user based on Twitter handle
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { twitterHandle, name, profileImageUrl } = data;
    
    if (!twitterHandle) {
      return NextResponse.json(
        { error: 'Twitter handle is required' },
        { status: 400 }
      );
    }
    
    // Create Twitter data
    const twitterData = {
      twitterHandle,
      name: name || twitterHandle,
      profileImageUrl,
      role: "user" as const,
      socialAccounts: {
        twitter: {
          handle: twitterHandle.replace('@', ''),
          followers: 0 // We would need to fetch this separately
        }
      }
    };
    
    // Identify or create user
    const { user, isNewUser } = await identifyUser(twitterData);
    
    return NextResponse.json({
      success: true,
      user,
      isNewUser
    });
  } catch (error) {
    console.error('Error in Twitter identity API:', error);
    return NextResponse.json(
      { error: 'Failed to process Twitter identity' },
      { status: 500 }
    );
  }
} 