# UTM Attribution Storage Implementation Checklist

## Overview
The frontend already captures all UTM parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content) and stores them in the URL history. However, the backend only stores a subset of this data. This checklist details the required changes to store all UTM parameters.

## Current State
- **Frontend**: Captures all UTM params in `member-attribution.js:96-100`
- **Backend**: Only stores `referrer_source`, `referrer_medium`, `referrer_url`
- **Missing**: `utm_campaign`, `utm_term`, `utm_content` (and separate `utm_source`/`utm_medium`)

---

## 1. Database Schema Updates

### 1.1 Add UTM columns to event tables
**Files to modify:**
- [ ] `ghost/core/core/server/data/schema/schema.js`

**Add these columns to THREE tables:**
- `members_created_events` (line ~524)
- `members_subscription_created_events` (line ~706)
- `members_donation_events` (line ~747)

```javascript
// Add after referrer_url in each table:
utm_source: {type: 'string', maxlength: 191, nullable: true},
utm_medium: {type: 'string', maxlength: 191, nullable: true},
utm_campaign: {type: 'string', maxlength: 191, nullable: true},
utm_term: {type: 'string', maxlength: 191, nullable: true},
utm_content: {type: 'string', maxlength: 191, nullable: true}
```

### 1.2 Create database migration
- [ ] Create migration file: `ghost/core/core/server/data/migrations/versions/5.XX.X/YYYY-MM-DD-HH-MM-add-utm-fields.js`
- [ ] Add columns to existing tables using knex schema builder
- [ ] Test migration up and down functions

### 1.3 Update model schemas
- [ ] Update Bookshelf models to include new fields:
  - `ghost/core/core/server/models/member-created-event.js`
  - `ghost/core/core/server/models/subscription-created-event.js`
  - `ghost/core/core/server/models/donation-event.js`

---

## 2. Backend Processing Updates

### 2.1 Update RouterController to extract UTM data
**File:** `ghost/core/core/server/services/members/members-api/controllers/RouterController.js`

- [ ] Modify `_setAttributionMetadata()` method (line ~198-240):
```javascript
async _setAttributionMetadata(metadata) {
    // Keep existing deletion of manual attribution fields
    delete metadata.attribution_id;
    delete metadata.attribution_url;
    delete metadata.attribution_type;
    delete metadata.referrer_source;
    delete metadata.referrer_medium;
    delete metadata.referrer_url;
    // Add deletion of UTM fields to prevent manual setting
    delete metadata.utm_source;
    delete metadata.utm_medium;
    delete metadata.utm_campaign;
    delete metadata.utm_term;
    delete metadata.utm_content;

    if (metadata.urlHistory) {
        const urlHistory = metadata.urlHistory;
        delete metadata.urlHistory;

        const attribution = await this._memberAttributionService.getAttribution(urlHistory);

        // Keep existing attribution fields
        if (attribution.id) {
            metadata.attribution_id = attribution.id;
        }
        // ... existing code ...

        // Add new UTM fields extraction
        // Get the first history entry with UTM data
        const utmEntry = urlHistory.find(entry =>
            entry.utmSource || entry.utmMedium || entry.utmCampaign ||
            entry.utmTerm || entry.utmContent
        );

        if (utmEntry) {
            if (utmEntry.utmSource) {
                metadata.utm_source = utmEntry.utmSource;
            }
            if (utmEntry.utmMedium) {
                metadata.utm_medium = utmEntry.utmMedium;
            }
            if (utmEntry.utmCampaign) {
                metadata.utm_campaign = utmEntry.utmCampaign;
            }
            if (utmEntry.utmTerm) {
                metadata.utm_term = utmEntry.utmTerm;
            }
            if (utmEntry.utmContent) {
                metadata.utm_content = utmEntry.utmContent;
            }
        }
    }
}
```

### 2.2 Update member signup flow
- [ ] Modify `sendMagicLink()` method to pass UTM data through tokenData (line ~753-757)
- [ ] Update the tokenData structure to include UTM fields

### 2.3 Update AttributionBuilder
**File:** `ghost/core/core/server/services/member-attribution/AttributionBuilder.js`

- [ ] Add UTM fields to Attribution class constructor (line ~25-27)
- [ ] Add UTM fields to getResource() return object (line ~58-61, ~68-71, ~81-84)
- [ ] Update build() method to accept UTM parameters (line ~121-130)

### 2.4 Update ReferrerTranslator
**File:** `ghost/core/core/server/services/member-attribution/ReferrerTranslator.js`

- [ ] Extend ReferrerData typedef to include UTM fields (line ~1-6)
- [ ] Modify `getReferrerDetails()` to extract and return UTM data from history (line ~33-66)

### 2.5 Update UrlHistory validation
**File:** `ghost/core/core/server/services/member-attribution/UrlHistory.js`

- [ ] Update UrlHistoryItem typedef to include UTM fields (line ~2-10)
- [ ] Ensure validation allows UTM fields in `isValidHistory()` (line ~50-63)

---

## 3. Frontend Updates (Minimal - Already Captures Data)

### 3.1 Verify data collection
**File:** `ghost/core/core/frontend/src/member-attribution/member-attribution.js`

- [x] ✅ Already captures all UTM data (lines 96-100)
- [x] ✅ Already includes in history entries (lines 128-129, 148-149)
- [ ] Test that all UTM params are properly passed in urlHistory

### 3.2 Ensure Portal sends complete data
**File:** `apps/portal/src/utils/api.js`

- [x] ✅ Already sends urlHistory with all data (lines 286-288, 451, 508)
- [ ] Verify getUrlHistory() includes UTM fields

---

## 4. Stripe Metadata Considerations

### 4.1 Evaluate Stripe metadata limits
- Stripe limits: 50 keys, 500 char values
- Current usage: attribution_id, attribution_url, attribution_type, referrer_source, referrer_medium, referrer_url

### 4.2 Decide which UTM fields to include
**File:** `ghost/core/core/server/services/members/members-api/controllers/RouterController.js`

Options:
- [ ] **Option A**: Include only utm_campaign (most valuable for tracking)
- [ ] **Option B**: Include utm_campaign and utm_content (for A/B testing)
- [ ] **Option C**: Include all UTM fields (if within limits)
- [ ] **Option D**: Store concatenated string (e.g., "campaign:value|term:value")

Recommended: Start with Option A, monitor usage, expand if needed.

---

## 5. Testing & Validation

### 5.1 Unit Tests
- [ ] Add tests for UTM extraction in RouterController
- [ ] Add tests for AttributionBuilder with UTM data
- [ ] Add tests for ReferrerTranslator UTM handling

### 5.2 Integration Tests
- [ ] Test member signup with UTM parameters
- [ ] Test subscription creation with UTM parameters
- [ ] Test donation flow with UTM parameters
- [ ] Verify data persistence in database

### 5.3 E2E Tests
- [ ] Create test with UTM params in URL
- [ ] Verify UTM data flows from Portal → API → Database
- [ ] Test data retrieval and display in admin

---

## 6. Admin Dashboard Updates (Optional - Phase 2)

### 6.1 Display UTM data in member details
- [ ] Update member detail view to show UTM attribution
- [ ] Add UTM columns to member export

### 6.2 Analytics improvements
- [ ] Add UTM campaign performance metrics
- [ ] Create UTM source/medium breakdown charts
- [ ] Add filters for UTM parameters in member list

---

## 7. Migration & Rollout

### 7.1 Deployment steps
1. [ ] Deploy database migration
2. [ ] Deploy backend changes
3. [ ] Deploy frontend changes (if any)
4. [ ] Monitor for errors

### 7.2 Rollback plan
- [ ] Prepare rollback migration
- [ ] Document rollback procedure
- [ ] Test rollback in staging

### 7.3 Performance considerations
- [ ] Index new UTM columns if needed for queries
- [ ] Monitor query performance
- [ ] Consider data retention policy for UTM data

---

## Implementation Priority

### Phase 1 (Core Storage) - Required
1. Database schema updates (Section 1)
2. Backend processing updates (Section 2)
3. Testing (Section 5)

### Phase 2 (Enhanced Tracking) - Optional
1. Stripe metadata (Section 4)
2. Admin dashboard updates (Section 6)

### Phase 3 (Analytics) - Future
1. Advanced UTM analytics
2. Attribution reporting
3. Campaign ROI tracking

---

## Notes

- The frontend already does the heavy lifting of capturing UTM data
- Main work is in backend to store and process this data
- Consider backward compatibility for existing members without UTM data
- UTM data should be immutable once stored (audit trail)
- Consider GDPR/privacy implications of storing additional tracking data