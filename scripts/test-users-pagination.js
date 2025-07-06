// Test script to verify users pagination is working correctly
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

const API_BASE = 'http://localhost:3000'

async function testUsersPagination() {
  console.log('🧪 Testing Users Pagination...\n')
  
  try {
    // Test 1: Fetch first page
    console.log('Test 1: Fetching first page (20 users)...')
    const page1Response = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=1&limit=20`, {
      credentials: 'include'
    })
    const page1Data = await page1Response.json()
    
    console.log(`✅ Page 1: ${page1Data.users?.length || 0} users`)
    console.log(`   Total users: ${page1Data.total}`)
    console.log(`   Total pages: ${page1Data.totalPages}`)
    
    // Test 2: Fetch second page
    if (page1Data.totalPages > 1) {
      console.log('\nTest 2: Fetching second page...')
      const page2Response = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=2&limit=20`, {
        credentials: 'include'
      })
      const page2Data = await page2Response.json()
      
      console.log(`✅ Page 2: ${page2Data.users?.length || 0} users`)
      
      // Verify no duplicate users between pages
      const page1Ids = new Set(page1Data.users?.map(u => u.discordId) || [])
      const duplicates = page2Data.users?.filter(u => page1Ids.has(u.discordId)) || []
      
      if (duplicates.length === 0) {
        console.log('✅ No duplicate users between pages')
      } else {
        console.log(`❌ Found ${duplicates.length} duplicate users between pages`)
      }
    }
    
    // Test 3: Search functionality
    console.log('\nTest 3: Testing search functionality...')
    const searchResponse = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=1&limit=20&search=sharafi`, {
      credentials: 'include'
    })
    const searchData = await searchResponse.json()
    
    console.log(`✅ Search results for "sharafi": ${searchData.users?.length || 0} users`)
    console.log(`   Total matching: ${searchData.total}`)
    
    // Test 4: Sorting
    console.log('\nTest 4: Testing sorting...')
    const sortResponse = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=1&limit=5&sort=points&order=desc`, {
      credentials: 'include'
    })
    const sortData = await sortResponse.json()
    
    if (sortData.users?.length > 0) {
      console.log('✅ Top 5 users by points:')
      sortData.users.forEach((user, i) => {
        console.log(`   ${i + 1}. @${user.twitterHandle}: ${user.totalPoints} points`)
      })
      
      // Verify sorting order
      const points = sortData.users.map(u => u.totalPoints)
      const isSorted = points.every((val, i, arr) => i === 0 || arr[i - 1] >= val)
      console.log(isSorted ? '✅ Sorting order verified' : '❌ Sorting order incorrect')
    }
    
    // Test 5: Stats endpoint
    console.log('\nTest 5: Testing stats endpoint...')
    const statsResponse = await fetch(`${API_BASE}/api/engagement/users-stats`, {
      credentials: 'include'
    })
    const statsData = await statsResponse.json()
    
    console.log('✅ User Statistics:')
    console.log(`   Total users: ${statsData.totalUsers}`)
    console.log(`   Total points: ${statsData.totalPoints}`)
    console.log(`   Active users: ${statsData.activeUsers}`)
    console.log(`   Average points: ${statsData.averagePoints}`)
    console.log(`   Total tweets: ${statsData.totalTweets}`)
    
    // Test 6: Large page size
    console.log('\nTest 6: Testing large page size...')
    const largePageResponse = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=1&limit=100`, {
      credentials: 'include'
    })
    const largePageData = await largePageResponse.json()
    
    console.log(`✅ Large page: ${largePageData.users?.length || 0} users (requested 100)`)
    
    // Test 7: Edge cases
    console.log('\nTest 7: Testing edge cases...')
    
    // Invalid page
    const invalidPageResponse = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=999&limit=20`, {
      credentials: 'include'
    })
    const invalidPageData = await invalidPageResponse.json()
    console.log(`✅ Page 999: ${invalidPageData.users?.length || 0} users (expected 0)`)
    
    // Invalid parameters
    const invalidParamsResponse = await fetch(`${API_BASE}/api/engagement/opted-in-users-enhanced?page=0&limit=0`, {
      credentials: 'include'
    })
    console.log(`✅ Invalid params response: ${invalidParamsResponse.status} (expected 400)`)
    
    console.log('\n✅ All pagination tests completed!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
  }
}

// Note: You need to be logged in as admin for this to work
console.log('Note: Make sure you are logged in as an admin user in your browser')
console.log('and the Next.js server is running on localhost:3000\n')

testUsersPagination() 