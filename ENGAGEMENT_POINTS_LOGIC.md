# Twitter Engagement Points Logic

## How Points Are Awarded

### Core Logic
Since Twitter API no longer provides direct access to who liked a tweet, we implement an automatic like points system:

1. **Automatic Like Points**: Points for likes are automatically awarded to users who Retweet OR Comment on tweets
2. **No Duplicate Like Points**: If a user both comments and retweets the same tweet, they receive like points only once
3. **Separate Action Points**: Users still receive separate points for each action (retweet and comment)

### Points Calculation Example

For a user with **Tier 2 (1.5x multiplier)**:
- Base points: Like=10, Retweet=20, Comment=30

**Scenario 1: User only retweets**
- Retweet points: 20 × 1.5 = 30 points
- Automatic like points: 10 × 1.5 = 15 points  
- **Total: 45 points**

**Scenario 2: User only comments**
- Comment points: 30 × 1.5 = 45 points
- Automatic like points: 10 × 1.5 = 15 points
- **Total: 60 points**

**Scenario 3: User both retweets AND comments**
- Retweet points: 20 × 1.5 = 30 points
- Comment points: 30 × 1.5 = 45 points
- Automatic like points: 10 × 1.5 = 15 points (only once!)
- **Total: 90 points**

## Implementation Details

The batch processor (`discord-bots/engagement-batch-processor.js`) implements this logic:

```javascript
// Track users who have been awarded like points to avoid duplicates
const usersAwardedLikePoints = new Set()

// When processing retweets
if (!usersAwardedLikePoints.has(connection)) {
  // Award like points
  usersAwardedLikePoints.add(connection)
}

// When processing comments
if (!usersAwardedLikePoints.has(connection)) {
  // Award like points
  usersAwardedLikePoints.add(connection)
}
```

## API Requirements

- **OAuth 1.0a Authentication**: Required for fetching retweets and replies
- **NO "Elevated" Access Required**: Standard API access is sufficient
- **NO tweetLikedBy Endpoint**: We don't use this endpoint at all

## Configuration

Ensure these environment variables are set:
- `TWITTER_API_KEY`: OAuth 1.0a Consumer Key
- `TWITTER_API_SECRET`: OAuth 1.0a Consumer Secret
- `TWITTER_ACCESS_TOKEN`: User Access Token
- `TWITTER_ACCESS_SECRET`: User Access Secret 