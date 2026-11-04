# Tinybird Analytics Endpoints

## Filtering Architecture

### Session-Level vs Hit-Level Attributes

Ghost analytics distinguishes between two types of attributes:

#### Session-Level Attributes

These are captured from the **first hit** (earliest timestamp) in a session using `argMinState(field, timestamp)` in the `_mv_session_data` materialized view (an `AggregatingMergeTree` table):

- `source` - Referring domain
- `utm_source` - UTM source parameter
- `utm_medium` - UTM medium parameter
- `utm_campaign` - UTM campaign parameter
- `utm_term` - UTM term parameter
- `utm_content` - UTM content parameter

Session-level attributes represent the **origin** of the session and remain constant throughout the entire session, even if subsequent pageviews have different UTM parameters or come from different sources.

#### Hit-Level Attributes

These can vary across pageviews within a session:

- `pathname` - URL path of the page
- `post_uuid` - UUID of the post/page
- `member_status` - Member status at time of hit (can change during a session)

### How Filtering Works

All endpoint filtering is handled through `filtered_sessions.pipe`, which uses a two-stage approach:

**Stage 1: Hit-Level Filters (`hit_filtered_sessions.pipe`)**

Finds sessions where **at least one hit** matches the hit-level filter criteria (pathname, post_uuid, member_status, location, gift_link). A session qualifies if ANY of its pageviews match the specified criteria.

**Stage 2: Session-Level Filters (`filtered_sessions.pipe`)**

```sql
NODE sessions_filtered_by_session_attributes
```

Further filters the stage 1 sessions by session-level attributes (source, device, utm_*) from `mv_session_data`. These filters check attributes from the **first hit only**. The result is the set of session IDs that match **all** filter criteria.

### Building Sessions Only for Matching Sessions

`mv_session_data.pipe` builds sessions from raw hits on every request. When a hit-level filter is set, it only builds the sessions returned by `hit_filtered_sessions`. Every endpoint inner joins `mv_session_data` with `filtered_sessions`, whose sessions are a subset of those, so the output is unchanged. This avoids building every session in the date range just to report on the few that touched one post or page.

`mv_session_data` can't reference `filtered_sessions` directly, because `filtered_sessions` reads from `mv_session_data` when a session-level filter is set.

### Important Behavior: All Hits from Matching Sessions

When endpoints join `_mv_hits` with `filtered_sessions`, they return **ALL hits from sessions that match the filter criteria**, not just the specific hits that matched.

#### Example: api_top_pages

```sql
select
    post_uuid,
    pathname,
    uniqExact(session_id) as visits
from _mv_hits h
inner join filtered_sessions fs
    on fs.session_id = h.session_id
```

**Scenario:** Filter by `utm_medium=social`

If there are 5 sessions where the first hit had `utm_medium=social`:

- The query returns ALL pageviews from those 5 sessions
- A single session might visit multiple pages (e.g., /, /about/, /blog/post/)
- Each page shows how many of the 5 sessions visited it
- The sum of visits across all pages can exceed 5 because sessions are counted once per unique page they visited

**Result:**

```json
{"pathname":"/about/","visits":3}     // 3 of the 5 sessions visited /about/
{"pathname":"/","visits":3}            // 3 of the 5 sessions visited /
{"pathname":"/blog/hello/","visits":2} // 2 of the 5 sessions visited /blog/hello/
```

Total: 8 page-session combinations from 5 unique sessions.

This behavior answers the question: **"What pages did users visit when they came from [source/utm]?"** rather than **"Which specific pageviews had [source/utm] in the URL?"**

### Filter Placement Rules

When creating or modifying endpoints:

1. **Session-level filters** (source, utm_*) → Only in `filtered_sessions.pipe`
2. **Hit-level filters** (pathname, post_uuid, member_status) → Can be in both:
   - `filtered_sessions.pipe` (for session qualification)
   - Endpoint queries (for additional filtering of results)
3. **Never duplicate** session-level filters in endpoint queries - always rely on `filtered_sessions`

### API Endpoint Patterns

All analytics endpoints follow this pattern:

```sql
from _mv_hits h
inner join filtered_sessions fs
    on fs.session_id = h.session_id
where
    site_uuid = {{ site_uuid }}
    -- Date range filters
    -- Hit-level filters only (if needed for this specific endpoint)
```

The join with `filtered_sessions` ensures only hits from sessions matching the filter criteria are included, while the `where` clause can apply additional hit-level filtering specific to the endpoint's purpose.
