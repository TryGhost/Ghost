# Locations to Update for Additional UTM Attribution Fields

To add `utm_term` and `utm_campaign` (in addition to existing `utm_source` and `utm_medium`) to member attribution, the following locations need updates:

## 1. Frontend - Parse and Capture UTM Parameters

### `/ghost/core/core/frontend/src/utils/url-attribution.js`
**Current:** Only captures `utm_source` and `utm_medium`
**Update needed:**
```javascript
// Line 11 - parseReferrer function
const utmTermParam = currentUrl.searchParams.get('utm_term');
const utmCampaignParam = currentUrl.searchParams.get('utm_campaign');

// Line 29 - return object
return {
    source: referrerSource,
    medium: utmMediumParam || null,
    term: utmTermParam || null,        // NEW
    campaign: utmCampaignParam || null, // NEW
    url: window.document.referrer || null
};
```

### `/ghost/core/core/frontend/src/member-attribution/member-attribution.js`
**Current:** Stores `referrerSource`, `referrerMedium`, `referrerUrl` in sessionStorage
**Update needed:**
```javascript
// Line 92-93 - extract new fields from referrerData
const referrerTerm = referrerData.term;
const referrerCampaign = referrerData.campaign;

// Line 138-144 - push to history array
history.push({
    path: currentPath,
    time: currentTime,
    referrerSource,
    referrerMedium,
    referrerTerm,     // NEW
    referrerCampaign, // NEW
    referrerUrl
});
```

## 2. Backend - Process and Store UTM Parameters

### Database Schema Updates

#### `/ghost/core/core/server/data/schema/schema.js`
**Tables to update:** `members_created_events` and `members_subscription_created_events`
**Add columns:**
```javascript
// Line 536-537 (after referrer_medium in members_created_events)
referrer_term: {type: 'string', maxlength: 191, nullable: true},
referrer_campaign: {type: 'string', maxlength: 191, nullable: true},

// Line 716-717 (after referrer_medium in members_subscription_created_events)
referrer_term: {type: 'string', maxlength: 191, nullable: true},
referrer_campaign: {type: 'string', maxlength: 191, nullable: true},
```

### Attribution Processing

#### `/ghost/core/core/server/services/member-attribution/AttributionBuilder.js`
**Update Attribution type and builder:**
```javascript
// Line 22-23 - add to constructor parameters
* @param {string|null} [data.referrerTerm]
* @param {string|null} [data.referrerCampaign]

// Line 26 - destructure new fields
constructor({
    id, url, type, referrerSource, referrerMedium, referrerUrl,
    referrerTerm, referrerCampaign // NEW
}, {urlTranslator}) {
    // Line 33-34 - store new properties
    this.referrerTerm = referrerTerm;
    this.referrerCampaign = referrerCampaign;
}

// Update getResource and build methods to include new fields
```

#### `/ghost/core/core/server/services/member-attribution/ReferrerTranslator.js`
**Update ReferrerData type and processing:**
```javascript
// Line 3-4 - add to ReferrerData typedef
* @prop {string|null} [referrerTerm]
* @prop {string|null} [referrerCampaign]

// Line 50-57 - return new fields
return {
    referrerSource,
    referrerMedium,
    referrerTerm: item.referrerTerm || null,       // NEW
    referrerCampaign: item.referrerCampaign || null, // NEW
    referrerUrl
};
```

### Event Storage

#### `/ghost/core/core/server/services/members-events/EventStorage.js`
**Store new fields in database:**
```javascript
// Line 35-37 - MemberCreatedEvent handler
referrer_source: attribution?.referrerSource ?? null,
referrer_medium: attribution?.referrerMedium ?? null,
referrer_term: attribution?.referrerTerm ?? null,       // NEW
referrer_campaign: attribution?.referrerCampaign ?? null, // NEW
referrer_url: attribution?.referrerUrl ?? null,

// Line 52-54 - SubscriptionCreatedEvent handler (same additions)
```

### Member Repository

#### `/ghost/core/core/server/services/members/members-api/repositories/MemberRepository.js`
**Pass attribution through creation flow:**
```javascript
// Line 1180-1182 - capture from Stripe metadata
referrerSource: data.attribution?.referrerSource ?? stripeSubscriptionData.metadata?.referrer_source ?? null,
referrerMedium: data.attribution?.referrerMedium ?? stripeSubscriptionData.metadata?.referrer_medium ?? null,
referrerTerm: data.attribution?.referrerTerm ?? stripeSubscriptionData.metadata?.referrer_term ?? null,       // NEW
referrerCampaign: data.attribution?.referrerCampaign ?? stripeSubscriptionData.metadata?.referrer_campaign ?? null, // NEW
```

### API Controllers

#### `/ghost/core/core/server/services/members/members-api/controllers/RouterController.js`
**Pass UTM data to Stripe and handle in signup:**
```javascript
// Line 181-183 - clean up metadata
delete metadata.referrer_source;
delete metadata.referrer_medium;
delete metadata.referrer_term;     // NEW
delete metadata.referrer_campaign; // NEW

// Line 206-211 - add to Stripe metadata
if (attribution.referrerTerm) {
    metadata.referrer_term = attribution.referrerTerm;
}
if (attribution.referrerCampaign) {
    metadata.referrer_campaign = attribution.referrerCampaign;
}
```

## 3. Migration Script Required

Create a new migration to add the columns to existing databases:
- Add `referrer_term` and `referrer_campaign` columns to `members_created_events`
- Add `referrer_term` and `referrer_campaign` columns to `members_subscription_created_events`

## 4. Type Definitions

Update TypeScript/JSDoc type definitions:
- `@tryghost/member-attribution/lib/Attribution` type
- Event data types in `/ghost/core/core/shared/events/`

## 5. Portal and Signup Form - No Changes Needed!

**Good news:** Portal and Signup Form don't need any updates! They already pass the complete urlHistory array from sessionStorage to the backend:

### Portal (`/apps/portal/src/utils/api.js`)
- Line 286-288: `sendMagicLink` reads and sends complete urlHistory
- Line 422: `checkoutPlan` sends urlHistory in metadata
- Line 479: `checkoutDonation` sends urlHistory in metadata

### Signup Form (`/apps/signup-form/src/utils/api.tsx`)
- Line 38: Sends complete urlHistory in signup request

**Why no changes needed:** These apps just pass through whatever is in sessionStorage. Since the member-attribution.js script will be storing the new UTM fields in the history, Portal and Signup Form will automatically include them.

## Data Flow Summary

1. **Frontend captures** UTM parameters from URL (`url-attribution.js`)
2. **Frontend stores** in sessionStorage history (`member-attribution.js`) - includes new UTM fields
3. **Portal/Signup Form reads** complete urlHistory from sessionStorage (no changes needed)
4. **Portal/Signup Form sends** urlHistory to backend on signup/checkout (already working)
5. **Backend processes** via `MemberAttributionService.getAttribution()` 
6. **Backend stores** in database via `EventStorage` handlers
7. **Database persists** in `members_created_events` and `members_subscription_created_events` tables

## Testing Considerations

- Verify UTM parameters are captured correctly from various URL formats
- Test portal hash URLs with UTM parameters
- Ensure backward compatibility (null handling for existing records)
- Test Stripe metadata limits (500 char values, 50 keys total)
- Verify attribution persistence through free-to-paid conversions