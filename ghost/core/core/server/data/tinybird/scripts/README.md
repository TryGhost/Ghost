# Ghost Data Scripts

This directory contains modular scripts for working with Ghost data, particularly for analytics and testing purposes.

## Scripts Overview

### 🚀 Complete Data Reset & Analytics Generation (`yarn reset:data:tinybird`)
**RECOMMENDED WORKFLOW** - Complete end-to-end data generation pipeline.

**What it does:**
1. Clears Ghost database completely
2. Generates fresh Ghost data (1000 members, 100 posts, seed: 123)
3. Uses that fresh data to generate realistic Tinybird analytics events
4. Writes analytics to `fixtures/analytics_events.ndjson`

**Features:**
- Ensures data consistency between Ghost and analytics
- Uses real post/member UUIDs from fresh database
- Color-coded progress output with timestamps
- Configurable number of analytics events
- Comprehensive error handling

**Usage:**
```bash
yarn reset:data:tinybird       # Default: 5000 events
yarn reset:data:tinybird 1000  # Custom: 1000 events
node reset-data-tinybird.js    # Direct usage
```

### 🔍 Query Posts (`query-posts.sh`)
Query Ghost's posts database with various filters and output formats.

**Features:**
- Multiple output formats (table, json, csv, uuids-only)
- Filters by status, type, limit
- Works from any directory

**Usage:**
```bash
./query-posts.sh -f json -l 10
./query-posts.sh -s published -p post
./query-posts.sh --help
```

### 👥 Query Members (`query-members.sh`)
Query Ghost's members database with various filters and output formats.

**Features:**
- Multiple output formats (table, json, csv, uuids-only)
- Filters by member status (free, paid, comped)
- Works from any directory

**Usage:**
```bash
./query-members.sh -f json -l 10
./query-members.sh -s paid -l 20
./query-members.sh --help
```

### 📊 Analytics Generator (`analytics-generator.js`)
Generate realistic analytics events using real Ghost post and member UUIDs from the database.

**Features:**
- Uses real post UUIDs from your Ghost database
- Uses real member UUIDs from your Ghost database
- Generates realistic user sessions and behavior
- Smart member UUID assignment (70% real members, 30% new members)
- Writes directly to `fixtures/analytics_events.ndjson`
- Customizable number of events (default: 1000)
- Fallback to mock data if database unavailable

**Usage:**
```bash
node analytics-generator.js          # Generate 1000 events
node analytics-generator.js 5000     # Generate 5000 events
```

### 🛠️ Database Utils (`database-utils.js`)
Modular database utility library for other scripts.

**Features:**
- Knex connection management
- Common database queries (posts, members, site config)
- Post and member UUID retrieval with filters
- Database statistics and site configuration
- Error handling with fallbacks

## Installation & Setup

The scripts are designed to work within the Ghost monorepo structure. They automatically detect the correct database connection path.

### Prerequisites
- Node.js (the version used by your Ghost installation)
- Ghost database properly configured
- All Ghost dependencies installed

### From Root Directory

```bash
# Query posts
yarn query:posts -f json -l 10

# Query members  
yarn query:members -s paid -l 20

# Generate analytics data
yarn generate:analytics        # 1000 events (default)
yarn generate:analytics 5000   # 5000 events

# Reset Ghost data & generate Tinybird analytics (RECOMMENDED)
yarn reset:data:tinybird       # Reset DB + generate 5000 events
yarn reset:data:tinybird 1000  # Reset DB + generate 1000 events

# Direct script access
yarn query:posts --help
yarn query:members --help  
yarn generate:analytics 2000
yarn reset:data:tinybird 1000
```

### From Ghost Core Directory

```bash
cd ghost/core

# Query posts
yarn query:posts -f uuids-only -l 20

# Query members
yarn query:members -s free -l 15

# Generate analytics
yarn generate:analytics 3000

# Direct script access
yarn query:posts -s published  
yarn query:members -s paid
yarn generate:analytics 1500
yarn reset:data:tinybird 2000
```

### Direct Script Usage

```bash
cd ghost/core/core/server/data/tinybird/scripts

# Query posts directly
./query-posts.sh -f json -s published -l 5

# Query members directly
./query-members.sh -s paid -l 10

# Generate analytics directly  
node analytics-generator.js 2000

# Use reset workflow
./reset-data-tinybird.js 1000
```

## Output Files

### Query Scripts
- Console output in various formats
- No files created

### Analytics Generator
- `../fixtures/analytics_events.ndjson` - Overwrites existing fixture file
- File size varies based on number of events generated
- Default: 1000 events (~0.5MB)

## Database Connection

The scripts automatically handle database connections using Ghost's existing knex configuration. If the database is unavailable, the analytics generator falls back to mock data.

**Connection Priority:**
1. Real Ghost database via knex
2. Fallback to hardcoded mock data
3. Graceful error handling

## Troubleshooting

### SQLite3 Issues
If you see sqlite3 binding errors, the scripts will fall back to mock data. This is expected behavior and the scripts will still function.

### Path Issues
The scripts auto-detect their location and adjust database paths accordingly. They work from:
- Root directory (via yarn scripts)
- Ghost core directory
- Scripts directory directly

### Permission Issues
Make sure scripts are executable:
```bash
chmod +x query-posts.sh cli.sh
```

## Adding New Scripts

1. Create your script in this directory
2. Add database utilities via `require('./db-utils')`
3. Add to `cli.sh` if needed
4. Update package.json scripts
5. Document in this README

## Example Integration

```javascript
// Using database utils in your script
const DatabaseUtils = require('./db-utils');

async function myScript() {
    const db = new DatabaseUtils();
    
    try {
        const posts = await db.getPostUuids({ published_only: true });
        console.log('Found posts:', posts.length);
        
        // Your logic here
        
    } finally {
        await db.close();
    }
}
``` 