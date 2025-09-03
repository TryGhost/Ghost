# Ghost Member Attribution Test Cases

## Complete Test Case List

### Frontend Tracking (member-attribution.js)

#### Session Storage & History Management
1. **First-time visitor** - Should create new `ghost-history` entry in sessionStorage with current path
2. **Repeat visitor same session** - Should append new paths to existing history array
3. **Same path navigation** - Should update timestamp but not duplicate path entry
4. **History limit enforcement** - Should maintain maximum 15 entries, removing oldest when exceeded
5. **Expired entries cleanup** - Should remove entries older than 24 hours on page load
6. **Invalid JSON recovery** - Should clear and restart history if stored data is corrupted

#### URL Parameter Attribution
7. **Direct post link with attribution params** - Member visiting `/post/?attribution_id=123&attribution_type=post` should capture attribution and clean URL
8. **Portal hash with UTM params** - Member visiting `/#/portal/?utm_source=newsletter&utm_medium=email` should extract UTM parameters
9. **Ref parameter priority** - `?ref=source` should take precedence over `utm_source`
10. **Multiple source params** - Should prioritize in order: `ref` > `source` > `utm_source`

#### Referrer Tracking
11. **External referrer** - Should capture referrer URL, source, and medium from document.referrer
12. **Same-domain referrer** - Should filter out referrers from same hostname
13. **Stripe checkout referrer** - Should ignore checkout.stripe.com as referrer source
14. **Search engine referrer** - Should identify and categorize known search engines
15. **Social media referrer** - Should identify and categorize social platforms

### Backend Attribution (MemberAttributionService)

#### Member Creation Attribution
16. **Direct post navigation** - Member created after navigating directly to a post should be attributed to that post
17. **Direct page navigation** - Member created from a page should be attributed to that page
18. **Tag archive navigation** - Member created from tag page should be attributed to that tag
19. **Author archive navigation** - Member created from author page should be attributed to that author
20. **Homepage signup** - Member created from homepage should have URL attribution only
21. **Custom URL signup** - Member created from non-resource URL should have URL attribution

#### Attribution Priority (Last Post Algorithm)
22. **Post over page** - History with both post and page should attribute to most recent post
23. **Post over tag** - History with post and tag should attribute to most recent post
24. **Page over tag (no post)** - History with page and tag but no post should attribute to page
25. **Tag over URL (no post/page)** - History with tag and URL but no post/page should attribute to tag
26. **URL only fallback** - History with only URLs should attribute to most recent URL

#### Context-Based Attribution
27. **Admin creation** - Member created via admin should have `referrerSource: "Created manually"` and `referrerMedium: "Ghost Admin"`
28. **API creation** - Member created via API should have `referrerSource: "Created via API"` and `referrerMedium: "Admin API"`
29. **Import creation** - Member imported should have `referrerSource: "Imported"` and `referrerMedium: "Member Importer"`
30. **Integration creation** - Member created via integration should include integration name in referrerSource

#### Subscription Attribution
31. **Free trial signup** - Should include offer ID in metadata when using free trial
32. **Paid subscription** - Should carry attribution from member creation to subscription
33. **Upgrade subscription** - Should maintain original attribution when upgrading tier
34. **Multiple subscriptions** - Each subscription should track its own attribution

#### UTM Parameter Handling
35. **UTM source only** - Should capture `utm_source` as referrerSource
36. **UTM source + medium** - Should capture both `utm_source` and `utm_medium`
37. **UTM override** - UTM parameters should override generic referrer detection
38. **UTM persistence** - UTM parameters should persist through navigation history

#### Email Attribution
39. **Newsletter click** - Links from newsletter with `ref=ghost-newsletter` should be attributed
40. **Transactional email** - Links from transactional emails should have appropriate attribution
41. **Email with post attribution** - Newsletter links to posts should include `attribution_id` and `attribution_type`

#### Edge Cases
42. **No JavaScript** - Members created without JavaScript should have null attribution
43. **Tracking disabled** - When tracking is disabled, should not store attribution
44. **Deleted resource** - Attribution to deleted/unpublished post should fallback to URL attribution
45. **Invalid attribution ID** - Invalid resource IDs should fallback to URL attribution
46. **Cross-domain navigation** - Should handle attribution across subdomains correctly

#### Attribution Metadata Storage
47. **Member creation event** - Should store attribution in `members_created_events` table
48. **Subscription event** - Should store attribution in `members_subscription_created_events` table
49. **Referrer components** - Should store referrerSource, referrerMedium, and referrerUrl separately
50. **Attribution resource** - Should store attribution_id, attribution_type, and attribution_url

---

## Critical E2E Test Paths

### 1. Direct Post Attribution
**Scenario:** Visitor lands directly on a post and signs up
- User navigates directly to `/welcome-to-ghost/`
- Frontend stores path in sessionStorage `ghost-history`
- User clicks "Subscribe" and completes signup
- Member should be attributed to the "Welcome to Ghost" post
- Verify: `attribution_type: 'post'`, `attribution_id: [post_id]`

### 2. Newsletter Email Attribution
**Scenario:** Member signs up via newsletter email link
- User clicks link in newsletter: `/new-feature/?ref=ghost-newsletter&attribution_id=123&attribution_type=post`
- Frontend captures UTM/ref parameters and post attribution
- URL parameters are cleaned after capture
- User completes signup
- Verify: `referrerSource: 'ghost-newsletter'`, post attribution preserved

### 3. Search Engine Discovery Attribution
**Scenario:** Visitor discovers site via Google and signs up
- User searches on Google and clicks result
- Lands on `/about/` page with referrer from google.com
- Browses to `/pricing/` page
- Then visits `/benefits/` post
- Signs up from the post
- Verify: Attribution to post, `referrerSource: 'Google'`, `referrerMedium: 'search'`

### 4. Social Media Campaign Attribution
**Scenario:** Marketing campaign on Twitter drives signups
- User clicks link from Twitter: `/special-offer/?utm_source=twitter&utm_medium=social`
- Browses multiple pages building history
- Eventually signs up
- Verify: `referrerSource: 'twitter'`, `referrerMedium: 'social'`, proper resource attribution

### 5. Multi-Touch Journey Attribution
**Scenario:** Complex user journey before signup
- User visits homepage (direct traffic)
- Returns next day via Google to a blog post
- Clicks through to author page
- Navigates to tag archive
- Finally signs up from a different post
- Verify: Attribution to final post visited, referrer from Google search

### 6. Admin/API Attribution
**Scenario:** Member created manually or via API
- Admin creates member directly in Ghost Admin
- Verify: `referrerSource: 'Created manually'`, `referrerMedium: 'Ghost Admin'`
- API creates member via integration
- Verify: `referrerSource: 'Integration: [name]'`, `referrerMedium: 'Admin API'`

### 7. Free-to-Paid Conversion Attribution
**Scenario:** Free member converts to paid with attribution tracking
- Free member originally attributed to specific post
- Receives email with upgrade link including attribution parameters
- Completes Stripe checkout
- Returns to site (ignore Stripe referrer)
- Verify: Original post attribution maintained on subscription

### 8. Edge Case: Deleted Content Attribution
**Scenario:** Member attributed to content that gets deleted
- User reads post and signs up (attributed to post)
- Post is later unpublished/deleted
- Verify: Attribution gracefully falls back to URL without error
- System maintains `attribution_url` even when resource is gone