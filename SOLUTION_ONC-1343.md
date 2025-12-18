# Solution: Complimentary Subscribers Should Be Able to View and Subscribe to Paid Plans via Offers

## Issue Summary
**Linear Issue:** ONC-1343  
**Problem:** Complimentary subscribers were unable to view offers in Ghost Portal because they are treated as "paid members" by the system. This prevented them from being shown offer links that would allow them to upgrade to a paid plan at a discount.

## Root Cause Analysis

### How the System Works

1. **Member Status Classification:**
   - Ghost classifies members into different types:
     - **Free members**: `member.paid === false`
     - **Paid members**: `member.paid === true` with an active subscription at full price
     - **Complimentary members**: `member.paid === true` with a subscription where `price.amount === 0`

2. **The Problem:**
   - In `apps/portal/src/app.js`, the `handleOfferQuery()` method had this logic:
     ```javascript
     if (!isPaidMember({member})) {
         // Show offer...
     }
     ```
   - This condition only allowed FREE members (where `member.paid === false`) to view offers
   - Complimentary members have `member.paid === true`, so they were blocked from viewing offers
   - This is because `isPaidMember()` returns `true` for complimentary members

3. **Helper Function Definitions:**
   - `isPaidMember({member})`: Returns `member && member.paid` (returns `true` for complimentary members)
   - `isComplimentaryMember({member})`: Checks if a member has `member.paid === true` AND either:
     - Has a subscription with `price.amount === 0`, OR
     - Has `member.paid === true` with no active subscription

## Solution Implementation

### Code Change
**File:** `apps/portal/src/app.js`  
**Method:** `handleOfferQuery()`  
**Line:** 754

**Before:**
```javascript
if (!isPaidMember({member})) {
    // Show offer logic
}
```

**After:**
```javascript
// Allow free members and complimentary members to view offers
if (!isPaidMember({member}) || isComplimentaryMember({member})) {
    // Show offer logic
}
```

### Logic Verification

With the new condition, here's how different member types are handled:

| Member Type | `isPaidMember()` | `isComplimentaryMember()` | Result | Can View Offers? |
|-------------|------------------|---------------------------|--------|------------------|
| Free        | `false`          | `false`                   | `!false \|\| false = true` | ✅ Yes |
| Complimentary | `true`         | `true`                    | `!true \|\| true = true` | ✅ Yes |
| Paid (Regular) | `true`        | `false`                   | `!true \|\| false = false` | ❌ No |

## How It Works Now

1. **For Free Members:**
   - Clicking an offer link opens the offer page
   - They can sign up for the paid plan at the discounted rate

2. **For Complimentary Members:**
   - Clicking an offer link now works! They can view the offer page
   - They can upgrade to a paid subscription at the discounted rate
   - This is similar to how they can already "Change plans" in Portal to become paid at full price

3. **For Regular Paid Members:**
   - Offers remain hidden (as intended)
   - They cannot downgrade using offer links

## Use Case Addressed

This change specifically enables the following workflow described in the issue:
- A site owner can send complimentary subscribers an email with an offer link (using `%OFFER_LINK%`)
- The offer provides a discount (e.g., 25% off) to become a paying member
- When complimentary subscribers click the offer link while logged in, they can now:
  - View the offer details
  - Subscribe to the paid plan at the discounted rate
  - Complete the checkout process

## Related Files

- `apps/portal/src/app.js` - Main change location
- `apps/portal/src/utils/helpers.js` - Helper functions for member type detection
- `apps/portal/src/components/pages/offer-page.js` - Offer display page (no changes needed)
- `apps/portal/src/actions.js` - Action handlers including `checkoutPlan` (no changes needed)

## Testing Recommendations

To test this change:

1. **Setup:**
   - Create a Ghost site with Stripe configured
   - Create an offer with a discount (e.g., 25% off monthly or yearly)
   - Create a member account
   - Give that member a complimentary subscription

2. **Test Steps:**
   - Log in as the complimentary member in Portal
   - Navigate to an offer link (e.g., `#/portal/offers/{offer-id}`)
   - Verify the offer page displays correctly
   - Verify you can proceed through checkout to upgrade

3. **Expected Results:**
   - Complimentary member sees the offer details
   - Complimentary member can click through to checkout
   - After successful checkout, member becomes a regular paid subscriber at the discounted rate

## Notes

- This change does not affect the backend offer API or validation
- The checkout process already handles the conversion from complimentary to paid correctly
- No changes were needed to the offer page itself, as it didn't have member-type restrictions
- The change maintains the existing behavior where regular paid members cannot view offers
