// This script identifies and removes users with broken profile images from the database
const { createClient } = require('redis');
const axios = require('axios');

// Initialize Redis client
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

async function isImageBroken(url) {
  if (!url) return true; // No image URL is considered broken
  
  try {
    // Try to get just the headers to check if image exists and is accessible
    const response = await axios.head(url, { 
      timeout: 5000,  // 5 second timeout
      validateStatus: status => status < 400 // Consider any non-error status as success
    });
    
    // Check if content type is an image
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`Non-image content type: ${contentType} for URL: ${url}`);
      return true;
    }
    
    return false; // Image is valid
  } catch (error) {
    console.log(`Error checking image at ${url}: ${error.message}`);
    return true; // Consider any error as a broken image
  }
}

async function removeUsersWithBrokenImages() {
  try {
    await redis.connect();
    console.log('Connected to Redis');
    
    // Get all user keys
    const userKeys = await redis.keys('user:*');
    console.log(`Found ${userKeys.length} users in the database`);
    
    let removedCount = 0;
    let checkedCount = 0;
    
    for (const userKey of userKeys) {
      try {
        const userId = userKey.replace('user:', '');
        const user = await redis.json.get(userKey);
        
        if (!user) {
          console.log(`No data found for user: ${userId}`);
          continue;
        }
        
        checkedCount++;
        
        // Check if profile image is broken
        const profileImageUrl = user.profileImageUrl;
        const isBroken = await isImageBroken(profileImageUrl);
        
        if (isBroken) {
          console.log(`Found broken profile image for user: ${userId}`);
          console.log(`User name: ${user.name || 'Unknown'}`);
          console.log(`Image URL: ${profileImageUrl || 'None'}`);
          
          // Remove user from status index
          const status = user.approvalStatus || 'pending';
          await redis.srem(`idx:status:${status}`, userId);
          
          // Remove user from other indexes if they exist
          if (user.twitterId) {
            await redis.del(`idx:twitter:${user.twitterId}`);
          }
          
          if (user.wallet) {
            await redis.del(`idx:wallet:${user.wallet}`);
          }
          
          // Remove user data
          await redis.del(userKey);
          
          console.log(`Removed user: ${userId}`);
          removedCount++;
        } else {
          console.log(`Image OK for user: ${userId}`);
        }
      } catch (error) {
        console.error(`Error processing user: ${userKey}`, error);
      }
    }
    
    console.log(`Completed. Checked ${checkedCount} users.`);
    console.log(`Removed ${removedCount} users with broken profile images.`);
    
  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await redis.disconnect();
    console.log('Disconnected from Redis');
  }
}

// Run the script
removeUsersWithBrokenImages().catch(console.error); 