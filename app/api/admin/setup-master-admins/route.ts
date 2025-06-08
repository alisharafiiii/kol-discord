import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { findUserByUsername } from '@/lib/user-identity';

export async function GET() {
  try {
    const masterAdmins = ['nabulines', 'sharafi_eth'];
    const results = [];
    
    for (const handle of masterAdmins) {
      console.log(`\nChecking @${handle}...`);
      
      // Find user by Twitter handle
      const user = await findUserByUsername(handle);
      
      if (user) {
        console.log(`✓ Found user: ${user.id}`);
        console.log(`  Current role: ${user.role || 'none'}`);
        console.log(`  Approval status: ${user.approvalStatus}`);
        
        // If not admin, update to admin
        if (user.role !== 'admin') {
          console.log(`  → Updating role to admin...`);
          user.role = 'admin';
          user.approvalStatus = 'approved';
          user.updatedAt = new Date().toISOString();
          
          // Save updated user
          await redis.json.set(`user:${user.id}`, '$', JSON.parse(JSON.stringify(user)));
          
          // Update role index
          await redis.sadd('idx:role:admin', user.id);
          
          results.push({
            handle,
            action: 'updated',
            message: `Updated @${handle} to admin role`
          });
        } else {
          results.push({
            handle,
            action: 'exists',
            message: `@${handle} already has admin role`
          });
        }
      } else {
        console.log(`✗ User not found - Creating admin user for @${handle}...`);
        
        // Create new admin user
        const newUser = {
          id: `twitter_${handle}`,
          name: handle,
          twitterHandle: handle,
          role: 'admin',
          approvalStatus: 'approved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save to Redis
        await redis.json.set(`user:${newUser.id}`, '$', JSON.parse(JSON.stringify(newUser)));
        
        // Create indexes
        await redis.sadd(`idx:username:${handle}`, newUser.id);
        await redis.sadd('idx:role:admin', newUser.id);
        await redis.sadd('idx:status:approved', newUser.id);
        
        results.push({
          handle,
          action: 'created',
          message: `Created admin user for @${handle}`
        });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Master admin setup complete',
      results 
    });
    
  } catch (error) {
    console.error('Error setting up master admins:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to setup master admins',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 