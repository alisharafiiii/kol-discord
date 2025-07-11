# Discord Engagement Tier Sync Fix Summary

## Issue
The engagement bot and admin panel were not syncing user tiers correctly:
- Admin panel shows/updates tiers in user profiles
- Discord bot reads tiers from engagement connections
- When admin updates a tier, it only updates the profile, NOT the engagement connection
- This causes a mismatch where users see wrong tiers in Discord

## Root Cause
The system stores tier information in TWO places:
1. **User Profile** (e.g., `twitter_username` or `profile:username`) - What admin panel sees
2. **Engagement Connection** (e.g., `engagement:connection:discordId`) - What Discord bot sees

When updating via admin panel, only #1 gets updated, not #2.

## Solution Applied

### Immediate Fix
Manually synced tiers for active users:
- @sharafi_eth → legend
- @saoweb3 → rising
- @hopcofficial → star
- @emahmad0 → rising
- @yaldamasoudi → rising
- @salimteymouri → rising

### Scripts Created
1. **diagnose-tier-sync.js** - Diagnoses tier mismatches
2. **manual-tier-sync.js** - Manually syncs specific users

### Long-term Fix Needed
The admin panel needs to update BOTH locations when changing a user's tier:

```javascript
// When admin updates user tier:
async function updateUserTier(handle, newTier) {
  // 1. Update user profile
  await updateProfile(handle, { tier: newTier })
  
  // 2. Also update engagement connection
  const discordId = await redis.get(`engagement:twitter:${handle}`)
  if (discordId) {
    await redis.json.set(`engagement:connection:${discordId}`, '$.tier', `"${newTier}"`)
  }
}
```

## How to Use the Scripts

### To diagnose tier issues:
```bash
cd discord-bots
node diagnose-tier-sync.js
```

### To manually sync tiers:
Edit the `usersToSync` array in `manual-tier-sync.js` with the correct tiers, then:
```bash
cd discord-bots
node manual-tier-sync.js
```

## Important Notes
1. When using `redis.json.set` for string values, they MUST be quoted: `"${value}"`
2. The Discord `/tier` command only updates the engagement connection
3. Users can force a sync by using `/connect` again in Discord
4. The engagement bot shows tiers from engagement connections in `/leaderboard` 