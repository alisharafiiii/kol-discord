# Analytics Validation Scripts

## Overview
These scripts validate that frontend analytics data matches exactly with Redis-stored backend data, ensuring zero discrepancies.

## Scripts

### 1. `quick-analytics-check.mjs` (⚡ Quick Check - 5 seconds)
**Purpose**: Fast validation of core metrics

**What it checks**:
- Message counts per project
- User counts per project  
- Sentiment percentages add up to 100%
- Data consistency (messages have users)
- Global totals
- Sample of today's activity

**Usage**:
```bash
node scripts/quick-analytics-check.mjs
```

**Output**:
- ✅ ZERO DISCREPANCIES - All checks passed!
- ❌ DISCREPANCIES FOUND - Lists specific issues

### 2. `validate-analytics-frontend.mjs` (🔍 Full Validation - 30+ seconds)
**Purpose**: Comprehensive validation of all analytics data

**What it checks**:
- Every message has required fields
- All sentiment tags are valid
- Sentiment percentages are accurate
- Date-based aggregations
- User statistics
- Channel distribution
- Orphaned data detection
- Data integrity validation

**Usage**:
```bash
node scripts/validate-analytics-frontend.mjs
```

**Output**:
- Detailed validation report
- Color-coded results
- Saves JSON report: `analytics-validation-{timestamp}.json`

### 3. `sentiment-summary.mjs` (📊 Date-Specific Check)
**Purpose**: Check sentiment data for specific dates

**What it checks**:
- Total messages per date
- Messages with/without sentiment tags
- Sentiment percentage breakdown
- Validates percentages add to 100%

**Usage**:
```bash
node scripts/sentiment-summary.mjs
```

## When to Use

- **Before deployments**: Run `quick-analytics-check.mjs` 
- **After bot updates**: Run `validate-analytics-frontend.mjs`
- **Daily monitoring**: Run `quick-analytics-check.mjs`
- **Debugging issues**: Run `validate-analytics-frontend.mjs` for full details

## Expected Results

✅ **All scripts should report ZERO DISCREPANCIES** if the system is working correctly.

❌ **If discrepancies are found**:
1. Check the specific error messages
2. Review recent changes to analytics bot
3. Verify Redis connectivity
4. Check for data migration issues

## Data Flow

```
Discord Messages → Analytics Bot → Redis Storage → Frontend Display
                                          ↓
                                  Validation Scripts
                                  (ensure data integrity)
``` 