import { getAllProjects, createProject } from '../lib/project';
import { redis } from '../lib/redis';

async function testProjects() {
  console.log('=== TESTING PROJECT STORAGE ===');
  
  try {
    // 1. Check all project keys in Redis
    console.log('\n1. Checking all project keys in Redis:');
    const projectKeys = await redis.keys('project:*');
    console.log(`Found ${projectKeys.length} project keys:`, projectKeys);
    
    // 2. Fetch all projects using getAllProjects
    console.log('\n2. Fetching all projects using getAllProjects():');
    const allProjects = await getAllProjects();
    console.log(`Found ${allProjects.length} projects`);
    
    if (allProjects.length > 0) {
      console.log('\nFirst project:');
      console.log(JSON.stringify(allProjects[0], null, 2));
    }
    
    // 3. Check if projects:all key exists (old caching key)
    console.log('\n3. Checking for old caching key:');
    const oldCacheExists = await redis.exists('projects:all');
    console.log(`Old cache key 'projects:all' exists: ${oldCacheExists === 1}`);
    
    if (oldCacheExists) {
      const cacheType = await redis.type('projects:all');
      console.log(`Type of 'projects:all': ${cacheType}`);
    }
    
    // 4. Check indexes
    console.log('\n4. Checking project indexes:');
    const stageKeys = await redis.keys('idx:project:stage:*');
    const priorityKeys = await redis.keys('idx:project:priority:*');
    const creatorKeys = await redis.keys('idx:project:creator:*');
    
    console.log(`Stage indexes: ${stageKeys.length}`);
    console.log(`Priority indexes: ${priorityKeys.length}`);
    console.log(`Creator indexes: ${creatorKeys.length}`);
    
    // 5. Create a test project
    console.log('\n5. Creating a test project:');
    const testProject = await createProject({
      twitterHandle: '@test_project_' + Date.now(),
      profileImageUrl: 'https://via.placeholder.com/150',
      followerCount: 1000,
      badgeType: 'none',
      priority: 'low',
      stage: 'dmd',
      socialLinks: {},
      website: 'https://example.com',
      notes: 'Test project created by script',
      assignedTo: undefined,
      createdBy: '0x0000000000000000000000000000000000000000'
    });
    
    console.log('Test project created:', testProject.id);
    
    // 6. Verify test project exists
    const verifyKeys = await redis.keys('project:*');
    console.log(`\n6. After creation, total project keys: ${verifyKeys.length}`);
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
  
  console.log('\n=== TEST COMPLETE ===');
  process.exit(0);
}

testProjects(); 