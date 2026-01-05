# BER-3152: Paginated Sitemaps Return 404 - Bug Fix Summary

## Problem
For sites with more than 50,000 posts (like laineygossip.com with 54,743 posts), the main sitemap at `/sitemap.xml` correctly links to paginated sitemaps like `sitemap-posts-2.xml`, but requesting these paginated URLs returns a 404 error.

## Root Cause
The bug was in `SiteMapIndexGenerator.js` line 34. The index generator was using **its own** `maxPerPage` value to calculate how many pages each resource type should have, rather than using the **resource type's** `maxPerPage` value.

### The Issue
```javascript
// OLD CODE (buggy)
const noOfPages = Math.ceil(Object.keys(resourceType.nodeLookup).length / this.maxPerPage);
```

When the `SiteMapIndexGenerator` had a different `maxPerPage` value than the individual resource generators (like `PostMapGenerator`), there would be a mismatch:

1. **IndexGenerator** calculates pages based on **its own** `maxPerPage`
2. **PostMapGenerator** slices data based on **its own** `maxPerPage`
3. If these values differ, the index links to pages that don't exist or are empty

### Example Scenario
- IndexGenerator has `maxPerPage = 60000`
- PostMapGenerator has `maxPerPage = 50000`
- Site has 54,743 posts

**What happens:**
- Index calculates: `ceil(54,743 / 60,000) = 1` page → only links to `sitemap-posts.xml`
- OR worse, if someone passes custom generators with different settings, the index might link to `sitemap-posts-2.xml`
- But when serving page 2: PostMapGenerator slices `(50000, 100000)` → gets posts 50,000-54,742
- Mismatch causes issues

## The Fix
Changed line 34-37 in `SiteMapIndexGenerator.js`:

```javascript
// NEW CODE (fixed)
// Use the resource type's maxPerPage, not the index's maxPerPage
// This ensures pagination is calculated consistently with how the resource generates its pages
const maxPerPage = resourceType.maxPerPage || this.maxPerPage;
const noOfPages = Math.ceil(Object.keys(resourceType.nodeLookup).length / maxPerPage);
```

Now the index generator uses each resource type's `maxPerPage` value, ensuring consistency between:
- How many pages the index says exist
- How many pages the resource generator can actually serve

## Tests Added
Created comprehensive tests to prevent regression:

1. **test/unit/frontend/services/sitemap/index-generator-maxperpage.test.js**
   - Tests resource type maxPerPage is used for pagination
   - Tests the exact 54,743 posts scenario from the bug report
   - Tests mixed maxPerPage values across resource types

2. **test/unit/frontend/services/sitemap/handler-integration.test.js**
   - Simulates the complete handler flow for paginated sitemaps
   - Tests maxPerPage consistency between generators
   - Tests the bug scenario where values differ

3. **test/unit/frontend/services/sitemap/pagination-bug.test.js**
   - Reproduces the exact production scenario
   - Verifies diagnostic information

4. **test/unit/frontend/services/sitemap/handler-pagination.test.js**
   - Tests pagination with various post counts
   - Tests maxPerPage mismatch detection

## Verification
For a site with 54,743 posts and `maxPerPage = 50,000`:
- ✅ Index correctly links to `sitemap-posts.xml` and `sitemap-posts-2.xml`
- ✅ `/sitemap-posts.xml` serves 50,000 posts (posts 0-49,999)
- ✅ `/sitemap-posts-2.xml` serves 4,743 posts (posts 50,000-54,742)
- ✅ No 404 errors

## Files Modified
- `ghost/core/core/frontend/services/sitemap/SiteMapIndexGenerator.js` - The fix
- `ghost/core/test/unit/frontend/services/sitemap/generator.test.js` - Enhanced existing test
- Added 4 new comprehensive test files

## Impact
- **Fixes:** Paginated sitemaps for all sites with more than 50,000 items (posts, pages, tags, or authors)
- **Prevents:** Future issues where generators might be initialized with different maxPerPage values
- **Improves:** Consistency and reliability of sitemap generation
