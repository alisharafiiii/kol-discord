import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    // Get all project keys
    const projectKeys = await redis.keys('project:*');
    
    // Get projects:all set members
    const projectsAllSet = await redis.smembers('projects:all');
    
    // Try to fetch first few projects directly
    const sampleProjects = [];
    for (let i = 0; i < Math.min(3, projectKeys.length); i++) {
      try {
        const project = await redis.json.get(projectKeys[i]);
        sampleProjects.push({
          key: projectKeys[i],
          data: project
        });
      } catch (e) {
        sampleProjects.push({
          key: projectKeys[i],
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }
    
    // Check if Redis JSON module is available
    let jsonModuleAvailable = true;
    try {
      await redis.json.get('test:nonexistent');
    } catch (e) {
      if (e instanceof Error && e.message.includes('unknown command')) {
        jsonModuleAvailable = false;
      }
    }
    
    return NextResponse.json({
      projectKeys: {
        count: projectKeys.length,
        sample: projectKeys.slice(0, 5)
      },
      projectsAllSet: {
        count: projectsAllSet.length,
        sample: projectsAllSet.slice(0, 5)
      },
      sampleProjects,
      jsonModuleAvailable,
      redisInfo: {
        url: process.env.REDIS_URL ? 'Configured' : 'Not configured'
      }
    });
  } catch (error) {
    console.error('Redis check error:', error);
    return NextResponse.json({ 
      error: 'Redis check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 