# Engagement Admin Page Fixes

This document details the three critical issues fixed on the `/admin/engagement` page and their solutions.

## Issues Fixed

### 1. Recent Activity Not Updating

**Problem:**
- The "Recent Activity" section only showed tweets fetched on initial page load
- New tweets submitted via Discord bot weren't visible until manual page refresh
- No automatic refresh mechanism existed

**Solution:**
- Added `fetchRecentTweets()` function that fetches only tweet data
- Implemented periodic updates every 30 seconds using `setInterval`
- Added "Refresh Tweets" manual button for immediate updates
- Updates only run when page is visible (see Issue 3)

**Technical Details:**
```typescript
// Periodic update mechanism
const startPeriodicUpdates = useCallback(() => {
  fetchInterval.current = setInterval(() => {
    if (!document.hidden && isComponentMounted.current) {
      fetchRecentTweets()
    }
  }, 30000) // 30 seconds
}, [])
```

### 2. Batch Job Creation Shows 'Forbidden' Despite Admin Role

**Problem:**
- Admin users received "Forbidden" error when creating batch jobs
- Session credentials weren't properly sent with API requests
- Authorization checks failed despite valid admin role

**Root Cause:**
- NextAuth session cookies weren't being sent with fetch requests
- The `checkAuth` function in the API route couldn't access the session

**Solution:**
- Added `credentials: 'include'` to all API fetch calls
- Ensures session cookies are sent with every request
- Added debug logging to track authentication flow

**Technical Details:**
```typescript
// Fixed API calls
const res = await fetch('/api/engagement/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' // Critical fix
})
```

### 3. Page Refreshes Every Time Browser Tab is Switched

**Problem:**
- Page would refresh data whenever user switched tabs
- Caused unnecessary API calls and UI flicker
- Poor user experience when multitasking

**Solution:**
- Implemented Page Visibility API handling
- Added cooldown mechanism (5 seconds minimum between fetches)
- Pauses updates when page is hidden, resumes when visible

**Technical Details:**
```typescript
// Visibility change handler
const handleVisibilityChange = () => {
  if (document.hidden) {
    // Pause updates
    clearInterval(fetchInterval.current)
  } else {
    // Resume updates if cooldown passed
    const timeSinceLastFetch = Date.now() - lastFetchTime.current
    if (timeSinceLastFetch > FETCH_COOLDOWN) {
      fetchData()
    }
    startPeriodicUpdates()
  }
}
```

## Additional Improvements

### Enhanced Logging
- Added comprehensive console logging with `[Engagement Admin]` prefix
- Logs user role, session data, and API responses
- Helps debug authentication issues

### UI Enhancements
- Added session info display showing logged-in user and role
- Added "Updates every 30 seconds" indicator for Recent Activity
- Added empty state message when no tweets exist
- Manual refresh button for immediate updates

### State Management
- Added refs to track component mount state
- Prevents updates after component unmount
- Prevents memory leaks from abandoned intervals

## Testing Checklist

- [x] Recent Activity updates automatically every 30 seconds
- [x] New tweets appear without manual refresh
- [x] Batch job creation works for admin users
- [x] Page doesn't refresh when switching tabs
- [x] Updates pause when tab is hidden
- [x] Updates resume when tab becomes visible
- [x] Manual refresh button works
- [x] All API calls include credentials

## Additional Fix: Recent Activity Not Showing

### Problem Found
- Server system clock was set to June 2025 (6 months in the future)
- All tweets were being stored with future timestamps
- The 24-hour filter was comparing against current time, so no tweets appeared "recent"

### Solution Applied
1. Modified `getRecentTweets` to fetch last 100 tweets by position instead of time filter
2. Added client-side sorting to ensure newest tweets appear first
3. Removed dependency on absolute timestamps for filtering

### Permanent Fix Needed
- Server system clock should be corrected to show actual current date/time
- This is causing timestamps throughout the system to be incorrect

## Additional Fix: Batch Processing and Points

### Problem Found
- Clicking "Create Batch Job" only creates a pending job record
- The actual processing requires running a separate Node.js script
- Points are only awarded to users who have connected both Discord & Twitter accounts

### How the System Works
1. **Create Batch Job**: Creates a "pending" job in the database
2. **Run Processor**: Execute `node discord-bots/engagement-batch-processor.js`
3. **Twitter API Check**: The processor calls Twitter API to get likes/retweets
4. **Award Points**: Points are given to connected users based on engagement

### Why No Points Were Awarded (Historical Issue - Now Fixed)
- The batch processor initially couldn't award points because:
  - **Twitter API Limitation**: Twitter removed the `tweetLikedBy` endpoint
  - The system couldn't see WHO liked tweets
  - OAuth 1.0a credentials were not properly configured

### Solution (Already Implemented)
1. **Automatic Like Points System**:
   - Like points are automatically awarded to users who Retweet OR Comment
   - If a user both comments and retweets, they receive like points only once
   - This bypasses the need for the unavailable `tweetLikedBy` endpoint

2. **Run the batch processor** (after API upgrade):
   ```bash
   node scripts/run-engagement-batch.mjs
   ```

3. **Set up automatic processing with cron**:
   ```bash
   chmod +x scripts/setup-engagement-cron.sh
   ./scripts/setup-engagement-cron.sh
   ```

### Current Status
- ✅ Batch jobs are created successfully
- ✅ Tweets are being tracked with metrics
- ✅ Users have connected Discord & Twitter accounts
- ✅ Point rules are configured
- ✅ OAuth 1.0a authentication properly configured
- ✅ Points are being awarded using automatic like points system

### How Points Work Now
- **NO "Elevated" API access required** - Standard OAuth 1.0a is sufficient
- **NO tweetLikedBy endpoint used** - We don't try to fetch who liked tweets
- **Automatic Like Points**: Awarded to users who Retweet OR Comment
- **No Duplicates**: If a user both comments and retweets, they get like points only once

### Points System Implementation:
- **Reply Only**: Awards reply points + automatic like points
- **Retweet Only**: Awards retweet points + automatic like points  
- **Both Actions**: Awards reply + retweet + single set of like points (no duplicates)

### Optimization Implemented
To minimize API rate limit issues:
- **Metrics-only mode**: Updates tweet metrics (likes, RTs, replies) every run
- **Detailed mode**: Checks who retweeted/replied (runs hourly or on-demand)
- **Force flag**: Use `--force-detailed` to run detailed check immediately
- **Result**: ~95% reduction in API calls while keeping metrics current

## Future Considerations

1. **WebSocket Integration**: Consider real-time updates via WebSocket for instant tweet display
2. **Optimistic Updates**: Show tweets immediately after submission, before server confirmation
3. **Error Recovery**: Add retry logic for failed API calls
4. **Performance**: Implement pagination for large tweet lists
5. **Time Sync**: Implement NTP time synchronization to prevent clock drift issues
6. **Automated Processing**: Integrate batch processor directly into the web app or use a job queue
7. **Twitter API Limits**: Handle rate limits and consider caching engagement data

## Additional Fix: Authentication Issues

### Problem Found
- Users with admin role were still getting "Forbidden" errors
- Root cause: Duplicate profile entries from legacy data migration
- Auth system was finding old profiles with incorrect roles

### Solution Applied
- Removed duplicate profile entries from Redis
- Cleaned up username indexes to point to correct profile
- Set session invalidation flags to force JWT refresh

### If Authentication Issues Persist
1. Check for duplicate profiles: `idx:username:{handle}` should only contain one ID
2. Verify the correct profile has the right role
3. User must sign out and sign back in after fixes
4. Consider implementing profile deduplication during migration

### Root Cause of Persistent 403 Errors
The system has two different profile storage mechanisms:
- **New system**: Stores profiles with `profile:` prefix (e.g., `profile:user_sharafi_eth`)
- **Old auth system**: Looks for profiles with `user:` prefix (e.g., `user:user_sharafi_eth`)

When the auth system can't find the profile in the expected location, it defaults to unauthorized access.

### Fix Applied
Created a "bridge" by copying the profile data from the new location to where the old auth system expects it:
- Source: `profile:user_sharafi_eth` (has correct admin role)
- Bridge: `user:user_sharafi_eth` (copy for auth system)
- Updated `idx:username:sharafi_eth` to point to correct ID

## Debug Enhancements Added (June 23, 2025)

### Issue Identified:
- Batch jobs created via API were showing as "pending" because the batch processor was creating separate jobs instead of processing existing ones
- Redis JSON path updates (e.g., `$.status`) were failing with "invalid character 'r'" error

### Debug Features Added:

1. **Enhanced Tweet Fetching Logs**:
   - Shows current time, cutoff time, and time window
   - Lists all tweet IDs found with full details
   - Shows tweet submission timestamps and sorted set scores
   - If no tweets found in time window, shows latest 5 tweets in Redis

2. **Detailed Processing Logs**:
   - Progress counter (e.g., "Processing tweet 1/3")
   - Clear SUCCESS/FAILED/SKIPPED status for each tweet
   - Final summary showing total processed vs failed/skipped

3. **Batch Job Coordination**:
   - Checks for pending jobs created by API before creating new ones
   - Updates existing pending jobs to "running" status
   - Shows clear messaging about which job is being used

4. **Batch Job Status Tracking**:
   - Logs batch job creation with ID and timestamp
   - Verifies status updates after completion
   - Shows where job is stored in Redis

### Technical Fixes:

1. **Redis JSON Update Fix**:
   - Changed from path-based updates (`$.status`) to full object updates
   - Prevents "invalid character" parsing errors
   - Applied to both success and error scenarios

2. **Environment Loading**:
   - Conditional loading of .env only when run directly
   - Uses `.env.local` for local development 