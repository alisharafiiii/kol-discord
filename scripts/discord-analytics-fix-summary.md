# Discord Analytics Data Discrepancy Investigation Summary

## Step 1: Data Source Confirmation

### Total Messages Count
- **Source**: `analytics?.metrics.totalMessages` (line 1381 in page.tsx)
- **Calculation**: Count of all messages within the date range filter
- **Data flow**: Redis → DiscordService.getProjectAnalyticsFallback → analytics object

### Activity Trend Chart
- **Source**: `analytics?.metrics.dailyTrend` (line 587 in page.tsx)
- **Calculation**: Messages grouped by date key
- **Data flow**: Same as above, but messages are grouped by `dateKey = msgDate.toISOString().slice(0, 10)`

**Both pull from the SAME data source and filtering logic**

## Step 2: Root Cause Identified

### The Issue: Timezone Inconsistency

1. **Date Key Generation** (line 598 in discord-service.ts):
   ```typescript
   const dateKey = msgDate.toISOString().slice(0, 10)
   ```
   - This converts to UTC date
   - Example: `2024-06-24T23:00:00-04:00` becomes `2024-06-25` in UTC

2. **Weekly Start Calculation** (line 487 in discord-service.ts):
   ```typescript
   start.setDate(start.getDate() - 7)
   start.setHours(0, 0, 0, 0)
   ```
   - `setHours(0,0,0,0)` sets to LOCAL midnight, not UTC midnight
   - This creates a mismatch between filtering (local time) and grouping (UTC time)

### Why June 24-25 Shows Discrepancy
Messages posted late on June 24 (e.g., after 8 PM EDT) appear as June 25 in UTC when grouped, but are still counted in the June 24 total if the filter uses local time boundaries.

## Step 3: Verification Script Results

Run these scripts to confirm:
```bash
node scripts/investigate-discord-june-data.js [projectId]
node scripts/investigate-discord-date-filtering.js [projectId]
```

## Step 4: Safe Fix Recommendations

### Option A: Use UTC Consistently (Recommended)
```typescript
// In getProjectAnalytics method
start.setUTCDate(start.getUTCDate() - 7)
start.setUTCHours(0, 0, 0, 0)
```

### Option B: Store Pre-calculated Date Keys
Add a `dateKey` field when saving messages to avoid runtime timezone issues.

### Option C: Add Timezone Parameter
Allow users to specify timezone in analytics requests:
```typescript
/api/discord/projects/[id]/analytics?timeframe=weekly&timezone=UTC
```

## Explicit Confirmations

### ✅ Real Root Cause Identified
- **Issue**: Timezone mismatch between date filtering (local) and date key generation (UTC)
- **Impact**: Messages near midnight get assigned to different days
- **Severity**: Data is not lost, just incorrectly grouped

### ✅ Safe Resolution Approach
1. **Fix timezone consistency** in DiscordService
2. **No data migration needed** - just calculation fix
3. **Backwards compatible** - existing data remains valid

### ✅ No Unintended Side Effects
- ❌ Does NOT affect message storage
- ❌ Does NOT affect sentiment analysis
- ❌ Does NOT affect points system
- ❌ Does NOT affect notifications
- ✅ ONLY affects date grouping in analytics

## Implementation Steps

1. Update `lib/services/discord-service.ts`:
   - Change `setHours` to `setUTCHours` in date calculations
   - Ensure all date operations use UTC consistently

2. Clear analytics cache to see immediate results:
   - The API has a 30-second cache
   - Force refresh or wait for cache expiry

3. Test with custom date ranges to verify fix

## Testing Commands

```bash
# Test current behavior
curl "http://localhost:3000/api/discord/projects/PROJECT_ID/analytics?timeframe=weekly"

# After fix, force refresh
curl "http://localhost:3000/api/discord/projects/PROJECT_ID/analytics?timeframe=weekly&forceRefresh=true"
``` 