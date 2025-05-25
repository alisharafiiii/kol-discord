import { NextRequest, NextResponse } from 'next/server';
import { createProject, checkProjectExists } from '@/lib/project';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { findUserByUsername } from '@/lib/user-identity';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  console.time('create-total');
  try {
    console.time('get-session');
    const session: any = await getServerSession(authOptions as any);
    console.timeEnd('get-session');
    
    console.log('--- PROJECT CREATE START ---');
    
    // Require Twitter login - NO WALLET CHECKS
    const sessionHandle = session?.twitterHandle || session?.user?.name;
    
    // Enhanced debugging
    console.log('SESSION DEBUG:', {
      hasSession: !!session,
      sessionTweetHandle: session?.twitterHandle,
      sessionUserName: session?.user?.name,
      sessionUserImage: session?.user?.image,
      extractedHandle: sessionHandle,
      sessionKeys: session ? Object.keys(session) : null,
      sessionUser: session?.user ? Object.keys(session.user) : null
    });
    
    if (!sessionHandle) {
      console.error('Project creation blocked: user not logged in with Twitter');
      console.error('Session details:', JSON.stringify(session, null, 2));
      return NextResponse.json({ error: 'Twitter login required to create projects' }, { status: 401 });
    }
    
    // Check if the Twitter user's profile has been approved
    const normalizedHandle = sessionHandle.replace('@', '').toLowerCase();
    console.log('USER LOOKUP DEBUG:', {
      originalHandle: sessionHandle,
      normalizedHandle: normalizedHandle
    });
    
    const twitterUser = await findUserByUsername(normalizedHandle);
    
    console.log('USER FOUND:', {
      found: !!twitterUser,
      userId: twitterUser?.id,
      role: twitterUser?.role,
      approvalStatus: twitterUser?.approvalStatus,
      twitterHandle: twitterUser?.twitterHandle
    });
    
    if (!twitterUser) {
      console.error(`Twitter user ${sessionHandle} not found in database`);
      console.error('Searched for normalized handle:', normalizedHandle);
      return NextResponse.json({ 
        error: 'Your Twitter account needs to be registered first. Please contact an admin.',
        debug: {
          sessionHandle,
          normalizedHandle,
          userFound: false
        }
      }, { status: 403 });
    }
    
    // Check if the user's profile is approved
    if (twitterUser.approvalStatus !== 'approved') {
      console.error(`Twitter user ${sessionHandle} not approved. Status: ${twitterUser.approvalStatus}`);
      return NextResponse.json({ 
        error: 'Your Twitter profile needs to be approved by an admin before you can create projects.',
        debug: {
          sessionHandle,
          normalizedHandle,
          userFound: true,
          approvalStatus: twitterUser.approvalStatus,
          role: twitterUser.role
        }
      }, { status: 403 });
    }
    
    console.log(`Twitter user ${sessionHandle} authorized. Role: ${twitterUser.role}, Status: ${twitterUser.approvalStatus}`);
    
    // Get project data from request body
    const data = await req.json();
    
    // Log received data for debugging
    console.log('Create project data received:', JSON.stringify(data));
    
    // Validate required fields
    if (!data.twitterHandle) {
      return NextResponse.json({ error: 'Twitter handle is required' }, { status: 400 });
    }
    
    if (!data.followerCount && data.followerCount !== 0) {
      return NextResponse.json({ error: 'Follower count is required' }, { status: 400 });
    }
    
    // Normalize Twitter handle to always include @
    const twitterHandle = data.twitterHandle.startsWith('@') 
      ? data.twitterHandle 
      : `@${data.twitterHandle}`;
    
    // Clear any cached duplicate check for this handle before checking
    const normHandle = twitterHandle.replace('@','').toLowerCase();
    await redis.del(`cache:handle-exists:${normHandle}`);
    
    // Check if project already exists
    const exists = await checkProjectExists(data.twitterHandle);
    if (exists) {
      console.error(`Duplicate project attempted: ${data.twitterHandle}`);
      return NextResponse.json({ 
        error: 'Project with this Twitter handle already exists',
        duplicate: true, 
        details: 'A project with this Twitter handle is already in the database. Please use a different handle or edit the existing project.'
      }, { status: 409 });
    }
    
    // Validate and sanitize socialLinks
    let sanitizedSocialLinks: Record<string, string> = {};
    if (data.socialLinks && typeof data.socialLinks === 'object') {
      // Ensure it's a proper object and all values are strings
      Object.entries(data.socialLinks).forEach(([platform, username]) => {
        if (typeof username === 'string') {
          sanitizedSocialLinks[platform] = username;
        }
      });
    }
    
    // Format website URL if needed - ensure it starts with https:// if not already
    let website = data.website || '';
    if (website && !website.match(/^https?:\/\//i)) {
      website = `https://${website}`;
      console.log(`Formatted website URL: ${website}`);
    }

    const creatorHandle = sessionHandle.startsWith('@') ? sessionHandle : `@${sessionHandle}`;
    console.log('Creator handle resolved (from session):', creatorHandle);

    // Attempt to fetch user profile image first
    let profileImageUrlFinal = data.profileImageUrl || '';

    // Use session image first
    if (!profileImageUrlFinal && session?.user?.image) {
       profileImageUrlFinal = session.user.image;
       console.log('Using profile image from session:', profileImageUrlFinal);
    }
    
    // Use Twitter user profile image as fallback
    if (!profileImageUrlFinal && twitterUser.profileImageUrl) {
       profileImageUrlFinal = twitterUser.profileImageUrl;
       console.log('Using profile image from user record:', profileImageUrlFinal);
    }

    if (!profileImageUrlFinal) {
      try {
        const handleWithoutAt = twitterHandle.replace('@', '');
        const avatarUrl = `https://unavatar.io/twitter/${handleWithoutAt}`;
        const avatarResp = await fetch(avatarUrl);
        if (avatarResp.ok) {
          profileImageUrlFinal = avatarUrl;
          console.log('Fetched profile image via Unavatar:', profileImageUrlFinal);
        }
      } catch (err) {
        console.warn('Unavatar fetch failed', err);
      }
    }

    console.log('Final profileImageUrl to use:', profileImageUrlFinal || 'none');

    // Prepare project data with sanitized values
    const projectData = {
      twitterHandle: twitterHandle,
      profileImageUrl: profileImageUrlFinal,
      followerCount: Number(data.followerCount) || 0,
      badgeType: ['gold', 'blue', 'none'].includes(data.badgeType) ? data.badgeType : 'none',
      priority: ['low', 'medium', 'high'].includes(data.priority) ? data.priority : 'medium',
      stage: data.stage || 'dmd',
      socialLinks: sanitizedSocialLinks,
      website: website,
      notes: data.notes || '',
      assignedTo: creatorHandle,
      createdBy: creatorHandle,
    };

    console.log('Prepared projectData:', JSON.stringify(projectData));

    try {
      // Create the project
      console.log('Creating project with data:', JSON.stringify(projectData));
      const project = await createProject(projectData);
      console.log('Project created successfully:', project.id);
      console.log('--- PROJECT CREATE END ---');
      console.timeEnd('create-total');

      // Invalidate project list cache and handle-exists cache
      try {
        const keys = ['projects:all', `cache:handle-exists:${normHandle}`];
        // Add twitter-based cache keys
        keys.push(`projects:assigned:${normalizedHandle}`, `projects:created:${normalizedHandle}`);
        await Promise.all(keys.map(k=>redis.del(k)));
      } catch {}

      return NextResponse.json({ success: true, project }, { status: 201 });
    } catch (createError) {
      console.error('Error in createProject:', createError);
      return NextResponse.json({ 
        error: 'Failed to create project',
        details: createError instanceof Error ? createError.message : 'Unknown error' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ 
      error: 'Failed to process project creation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    try { console.timeEnd('create-total'); } catch {}
  }
} 