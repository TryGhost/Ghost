# Plan to Remove Gravatar Support from Ghost

## 1. Backend Core Changes

### Remove Gravatar Class and Integration
- Delete `/ghost/core/core/server/lib/image/Gravatar.js`
- Update `/ghost/core/core/server/lib/image/ImageUtils.js` to remove Gravatar import and initialization
- Update `/ghost/core/core/server/lib/image/index.js` exports if needed

### Update User Model
- Modify `/ghost/core/core/server/models/user.js` to remove Gravatar lookup on email changes (lines 208-211)
- Remove the gravatar requirement and lookup logic

### Update Member Model  
- Modify `/ghost/core/core/server/models/member.js` to remove automatic avatar_image assignment using Gravatar (lines 396-402)
- Return a dynamically generated SVG avatar as a base64 data URL to maintain backwards compatibility
- **Create Avatar Generation Utility**:
  - Create `/ghost/core/core/server/lib/image/avatar-generator.js` with:
    - Port `getInitials` logic from `/apps/comments-ui/src/utils/helpers.ts` (lines 87-102)
    - Port `stringToHslColor` logic from `/ghost/admin/app/components/gh-member-avatar.js` (lines 4-12)
    - Implement `createInitialsAvatar(initials, colorHex)` function that:
      - Takes initials (max 2 characters) and color hex
      - Generates an SVG with colored background and white text
      - Returns base64 encoded data URL: `data:image/svg+xml;base64,{encoded}`
  - Example implementation:
    ```javascript
    function createInitialsAvatar(initials, colorHex) {
      const text = initials.slice(0, 2).toUpperCase();
      const color = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
      
      const svgContent = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="180" height="180" fill="${color}"/>
        <text x="100" y="120" font-family="Arial, sans-serif" font-size="72" font-weight="bold" text-anchor="middle" fill="white">${text}</text>
      </svg>`;
      
      const base64 = btoa(svgContent);
      return `data:image/svg+xml;base64,${base64}`;
    }
    ```
- **Update Member Model's toJSON()**:
  - Extract initials from member name (or email if no name)
  - Generate consistent color using ported `stringToHslColor`:
    - Use member name for color generation if available (primary)
    - Fall back to email address for color if no name exists
    - This matches the frontend behavior in gh-member-avatar.js
  - Return SVG data URL as `avatar_image` instead of Gravatar URL
  - This maintains backwards compatibility for integrations/themes expecting an avatar_image URL
- **Important: No Frontend Changes Required**:
  - The Ghost Admin and Portal apps already have their own initials rendering logic
  - They will continue to use their existing components (gh-member-avatar, MemberGravatar)
  - The frontend ignores the API's avatar_image and renders initials locally for better UI performance
  - The API-provided SVG avatars are primarily for external integrations, emails, and webhooks
  - This approach requires ZERO frontend changes while maintaining full backward compatibility

### Configuration Changes
- Remove gravatar configuration from `/ghost/core/core/shared/config/defaults.json` (lines 244-245)
- Update `/ghost/core/core/server/services/public-config/config.js` to remove useGravatar property (line 14)

## 2. Admin Interface Updates

### Update Member Avatar Component
- Keep `/ghost/admin/app/components/gh-member-avatar.hbs` and `.js` but ensure they work without Gravatar URLs
- The component already has fallback to initials when no avatar_image exists

### Update Mirage/Mock Data
- Update `/ghost/admin/mirage/factories/user.js` to remove Gravatar references
- Update `/ghost/admin/mirage/fixtures/configs.js` to remove Gravatar config
- Update `/ghost/admin/mirage/routes-dev.js` and `routes-test.js` if they contain Gravatar logic

## 3. Portal App Changes

### Remove MemberGravatar Component
- Delete `/apps/portal/src/components/common/MemberGravatar.js`
- Delete `/apps/portal/src/components/common/MemberGravatar.test.js`
- Update components that use MemberGravatar:
  - `/apps/portal/src/components/TriggerButton.js`
  - `/apps/portal/src/components/pages/AccountProfilePage.js`
  - `/apps/portal/src/components/pages/AccountHomePage/components/UserHeader.js`
- Replace with a simpler avatar component showing initials or default icon

### Update Styles
- Clean up `/apps/portal/src/components/Frame.styles.js` if it contains Gravatar-specific styles
- Update `/apps/portal/src/components/TriggerButton.styles.js`

## 4. API and Serializers

### Update API Serializers
- Check `/ghost/core/core/server/api/endpoints/utils/serializers/output/config.js` for Gravatar references
- Update `/ghost/core/core/server/api/endpoints/utils/serializers/output/members.js` if it processes avatar_image
- Update `/ghost/core/core/server/api/endpoints/utils/serializers/output/mappers/comments.js` for comment author avatars

## 5. Test Updates

### Remove Gravatar-specific Tests
- Delete `/ghost/core/test/unit/server/lib/image/gravatar.test.js`

### Update Existing Tests
- Update `/ghost/core/test/legacy/models/model_users.test.js` to remove Gravatar expectations
- Update `/ghost/core/test/unit/server/models/member.test.js` to remove avatar_image Gravatar tests
- Update `/ghost/core/test/unit/server/services/public-config/config.test.js` to remove useGravatar tests
- Update `/ghost/core/test/unit/server/services/members/utils.test.js` if it tests Gravatar
- Update `/ghost/core/test/unit/server/lib/image/image-size.test.js` if it includes Gravatar URLs

### Update Snapshots and Fixtures
- Update test snapshots that contain Gravatar URLs:
  - `/ghost/core/test/e2e-api/admin/__snapshots__/config.test.js.snap`
  - `/ghost/core/test/e2e-api/admin/__snapshots__/members.test.js.snap`
  - `/ghost/core/test/e2e-api/admin/__snapshots__/comments.test.js.snap`
  - `/ghost/core/test/e2e-api/members/__snapshots__/webhooks.test.js.snap`
  - `/ghost/core/test/e2e-webhooks/__snapshots__/members.test.js.snap`
  - `/ghost/core/test/e2e-server/__snapshots__/click-tracking.test.js.snap`
  - `/ghost/core/test/e2e-api/members-comments/__snapshots__/comments.test.js.snap`
- Update current test fixtures only:
  - `/apps/comments-ui/test/utils/fixtures.ts`
  - `/apps/admin-x-framework/src/test/responses/config.json`
- **DO NOT update historical export fixtures** (these represent older Ghost versions):
  - Keep `/ghost/core/test/utils/fixtures/export/v4_export.json` unchanged
  - Keep `/ghost/core/test/utils/fixtures/export/v3_export.json` unchanged
  - Keep `/ghost/core/test/utils/fixtures/export/v2_export.json` unchanged
  - These files preserve the historical data format and should remain as-is

## 6. Frontend/Theme Updates

### Update Helper Functions
- Check `/ghost/core/core/frontend/utils/images.js` for Gravatar references

### Update CSS
- Clean up `/ghost/admin/app/styles/layouts/members.css` for Gravatar-specific styles
- Clean up `/ghost/admin/app/styles/layouts/dashboard.css` for Gravatar-specific styles

## 7. Additional Components

### Comments UI
- Update `/apps/comments-ui/test/utils/fixtures.ts` to use placeholder avatars instead of Gravatar URLs

### Debug Component
- Check `/ghost/admin/app/components/posts/debug.hbs` for Gravatar references

## Implementation Order

1. **Start with backend core changes** - Remove Gravatar class, update models
2. **Update configuration files** - Remove Gravatar settings from config
3. **Update API serializers** - Ensure avatar_image returns SVG data URLs
4. **Update frontend components** - Handle missing avatars gracefully
5. **Update all tests** - Reflect the changes in test expectations
6. **Update snapshots and fixtures** - Remove Gravatar URLs from test data
7. **Run full test suite** - Ensure everything works correctly
8. **Final verification** - Run `rg -i gravatar` to ensure no references remain in the codebase (case-insensitive search)

## Notes

- **GDPR Compliance**: This change addresses GDPR concerns by:
  - No longer sending hashed email addresses to Gravatar (Automattic's servers)
  - Eliminating the transfer of personal data to third parties for avatar purposes
  - Removing the need for disclosure and consent related to Gravatar usage
- The system currently uses Gravatar for both user profile images and member avatars
- After removal, the system will fall back to showing initials or a default icon
- The privacy setting `useGravatar` will no longer be needed (can be removed entirely)
- All existing Gravatar URLs in the database will become invalid but the system will handle this gracefully with the default avatar
- Publishers won't need to know what Gravatar is anymore, reducing confusion
