## Problem

All session IDs rollover at midnight **UTC**, but endpoint date boundaries are based on **local timezone**. Therefore, a session can start "yesterday" in local timezone, and end "today" in local timezone. This the "cross-boundary" problem.

## In an ideal world...

-   Session IDs would rollover at midnight in the site's timezone, so there would be no cross-boundary sessions. Each session would be cleanly attributed to a single day in the site timezone and all queries would be made in site timezone (regardless of local time). But, this creates some challenges:
    -   The analytics service would need to know each site's timezone, which it currently does not
    -   Site timezone can be updated - how do we deal with existing sessions, which will now have the same cross-boundary problem



## Example:

Session 1 pageviews: 
    1. Pageview on January 2 at 7AM UTC (January 1 11PM PST) 
    2. Pageview on January 2 at 9AM UTC (January 2 1AM PST)

-   Both visits receive the same session ID, because the visits do not span midnight UTC
-   If querying from UTC, this visit will only appear on January 2nd - no cross boundary issue
-   If querying from PST, this visit will appear in both January 1st and January 2nd
    -   first_pageview = January 1 11PM
    -   last_pageview = January 2 1AM

### Query Scenarios:

Assume we are querying with timezone set to PST. The most relevant case is the api_kpis endpoint, since it returns a time series:

1. If I filter to only January 1st, how many pageviews and visits would we expect?
    - 1 visit, 1 pageview (v1) - filters to all hits on January 1 (in local timezone), then aggregates pageviews by session
    - 1 visit, 2 pageviews (v2) - aggregates pageviews by session, then filters to sessions with first_pageview on January 1
    - 1 visit on January 1, 1 pageview on Jan 1, 1 pageview Jan 2 (expected)

2. If I filter to only January 2nd, how many pageviews and visits would we expect?
    - 1 visit, 1 pageview (v1) - filters to all hits on January 1, then aggregates pageviews by session
    - 0 visits, 0 pageviews (v2) - aggregates pageviews by session, then filters on session's first_pageview
    - 0 visits, 1 pageview (expected)

3. If I filter to the month of January, how should the visit and pageview be bucketed?
    - 1 visit and 2 pageviews on January 1 (v1 and v2)
    - 1 visit and 2 pageviews on January 2
    - 1 visit on Jan 1, 1 pageview Jan 1, 1 pageview Jan 2 (expected)

# Types of queries
- Visits by _first_ pageview 
    - Time-bucketing: first_pageview - how many visits where the initial pageview meets the filter criteria?
    - Filtering: first_pageview (i.e. the source of the visit - we only care about the first pageview of the visit)
    - Endpoints:
        - api_kpis (sessions only)
        - top_sources
        - top_utm_*
- Unique Visits by _any_ pageview - how many visits include a pageview that meets the filter criteria?
    - Time-bucketing: any pageview (??)
    - Filtering: any pageview for the visit (i.e. any visit that includes a pageview for /about/)
    - Endpoints:
        - top_pages
- Pageviews - how many pageviews meet the filter criteria?
    - Time-bucketing: pageview's timestamp
    - Filtering: pageview itself
    - Endpoints:
        - api_kpis (pageviews only)
