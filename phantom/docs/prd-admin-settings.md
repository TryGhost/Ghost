# Ghost v10 Admin Settings PRD (Admin X Settings)

## Purpose
Define acceptance criteria for the Admin X settings app used to configure site,
membership, and growth settings.

## Scope
- Covers the existing React settings app in `apps/admin-x-settings`, running
  unmodified against the v10 Admin API compat facade (`prd.md` section 22).
- Covers Admin API-backed configuration flows surfaced in the settings UI.
- Derived from acceptance tests in `apps/admin-x-settings/test/acceptance`.
- To be verified by browser e2e tests running the app against v10.

## Non-goals
- ActivityPub settings and network features.
- Core content editor or posts management (covered in `prd.md`).
- Backend operational behaviors (covered in `prd-operations.md`).

## Key principles
- Settings changes are explicit and saved via Admin API requests.
- Role-based access and plan limits drive UI availability.
- Settings changes should be reflected immediately in previews.

## Settings experience and requirements

### 1) Layout, routing, and permissions
- [ ] Unsaved changes show a leave-confirmation dialog.
  - Navigation away prompts when a section is dirty.
- [ ] Search filters settings groups by keyword.
  - Matching sections stay visible while others hide.
  - When no matches exist, all sections remain visible.
- [ ] Route refresh restores open modals.
  - Portal customization stays open after reload.
- [ ] Role-based access limits settings visibility.
  - Editors see the users section but not global settings.
  - Authors and contributors see only their profile modal without sidebar.

### 2) Site profile and branding
- [ ] Title and description edits persist via the settings API.
  - Empty/too-short titles show validation errors and block save.
  - Successful saves update UI state and payloads.
- [ ] Publication language, time zone, SEO, social accounts, and lock-site
  settings are editable with validation.
- [ ] Design, navigation, announcement bar, and theme settings are editable and
  persist across reloads.

### 3) Membership access controls
- [ ] Access settings control signup, default content visibility, and comments.
  - Dropdowns expose expected options for each setting.
  - Saving updates settings payloads and on-screen values.
  - Disabling signup disables related sections (portal customization, newsletter
    signup).
- [ ] Specific tier access selection saves selected tier ids.

### 4) Portal configuration
- [ ] Portal preview modal loads and persists on refresh.
- [ ] Signup options toggle display name and free tier visibility.
  - Free tier controls are hidden when site signup is paid-only.
  - Updating free tier visibility persists via tier updates.
- [ ] Look and feel settings persist portal button visibility and copy.
- [ ] Account settings persist support address changes.

### 5) Tiers and Stripe
- [ ] Tier creation validates required fields and minimum prices.
- [ ] Tier editing updates name, description, pricing, trials, and benefits.
  - Preview reflects pricing and benefit changes before save.
- [ ] Free tier supports description, welcome page, and benefits.
- [ ] Stripe Connect flow supports live/test mode and secure token save.
- [ ] Stripe Direct mode updates publishable and secret keys.
- [ ] Plan limits gate Stripe Connect with upgrade CTAs.
- [ ] Direct routing to Stripe Connect respects limits and redirects to upgrade.

### 6) Offers
- [ ] Offers modal opens from settings and manage flows.
- [ ] Creating offers validates required fields and unique codes.
- [ ] Offer creation shows success confirmation.
- [ ] Active and archived offers list in separate tabs.
- [ ] Offer editing validates codes and persists updates.

### 7) Recommendations
- [ ] Recommendations list displays outgoing and incoming recommendations.
- [ ] Add flow validates URL and description length.
- [ ] Duplicate URL errors surface via toast messaging.
- [ ] Edit and delete flows persist via the recommendations API.

### 8) Membership analytics settings
- [ ] Analytics toggles persist settings for web analytics, member sources,
  newsletter opens/clicks, and outbound tagging.
- [ ] Read-only analytics settings render as disabled controls.
- [ ] Web analytics shows configuration guidance when unconfigured.
- [ ] Plan limits show upgrade CTAs and disable analytics toggles.
- [ ] Post analytics export triggers CSV download requests.

### 9) Email settings
- [ ] Newsletter and email provider settings are editable and persisted.
- [ ] Default recipient configuration saves via the Admin API.
- [ ] Mailgun configuration surfaces validation feedback.

### 10) Advanced and integrations
- [ ] Code injection, history, spam filters, integrations, migration tools,
  labs, and danger zone settings are accessible and save correctly.
