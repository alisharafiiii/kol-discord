# Twitter Batch Sync Implementation

## Overview
Implemented batch processing for Twitter/X post syncing to avoid rate limiting and improve performance.

## Changes Made

### 1. Updated API Route (`/api/metrics/fetch-twitter`)
- **Previous**: Accepted single URL only
- **Now**: Accepts both single URL and batch of URLs
- Maintains backward compatibility for single URL requests
- Uses Twitter API v2 batch endpoint (supports up to 100 tweets per request)
- Returns structured response with `results` and `errors` for batch requests

### 2. Updated Sync Function (`app/metrics/share/[shareId]/page.tsx`)
- **Previous**: Made individual API requests for each Twitter post with 1-second delays
- **Now**: Collects all Twitter URLs and sends single batch request
- Still updates each post individually in the database after fetching
- Shows progress during database updates

## Benefits
1. **Performance**: Single API request instead of N requests
2. **Rate Limiting**: Less likely to hit Twitter API rate limits
3. **Speed**: Faster sync process (no artificial delays needed)
4. **User Experience**: Progress still visible during database updates

## API Usage

### Single URL (backward compatible):
```json
POST /api/metrics/fetch-twitter
{
  "url": "https://twitter.com/user/status/123456789"
}

Response:
{
  "likes": 100,
  "retweets": 20,
  "replies": 5,
  "impressions": 1000,
  "authorName": "John Doe",
  "authorPfp": "https://..."
}
```

### Batch URLs:
```json
POST /api/metrics/fetch-twitter
{
  "urls": [
    "https://twitter.com/user/status/123456789",
    "https://twitter.com/user/status/987654321"
  ]
}

Response:
{
  "results": {
    "https://twitter.com/user/status/123456789": {
      "likes": 100,
      "retweets": 20,
      "replies": 5,
      "impressions": 1000,
      "authorName": "John Doe",
      "authorPfp": "https://..."
    }
  },
  "errors": {
    "https://twitter.com/user/status/987654321": "Tweet not found (may have been deleted)"
  }
}
```

## Rate Limit Headers
Both single and batch responses include rate limit headers:
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Unix timestamp when rate limit resets
