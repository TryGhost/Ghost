# Automation Design Tab Cleanup + Welcome-Email Semantics

## Summary
Refine automation design customization so it matches welcome-email semantics instead of newsletter assumptions.

1. Remove automation use of `Post title color` and `Title alignment`.
2. Use one heading color control (`section_title_color`, labeled `Heading color`) for automation heading levels.
3. Update automation preview to include a real header region so `Header background color` applies behind header image/title.
4. Split design contracts so automation does not carry newsletter-only design fields.
5. Keep newsletter behavior unchanged.

## Ground Truth
1. Welcome-email editor toolbar exposes heading controls for `H2` and `H3`.
2. Welcome-email rendering wrapper styles `H1-H6`.
3. Current header background mismatch is a preview layout issue.

## Interface Changes
1. Split design drafts:
   - `BaseEmailDesignDraft` (shared)
   - `NewsletterDesignDraft` (`post_title_color`, `title_alignment`)
   - `AutomationDesignDraft` (no newsletter-only fields)
2. Split preview contracts similarly:
   - Newsletter preview keeps `post_title_color`, `title_alignment`
   - Automation preview drops them
3. Automation local state shape removes `post_title_color` and `title_alignment`.
4. Split defaults:
   - `DEFAULT_NEWSLETTER_DESIGN_VALUES`
   - `DEFAULT_AUTOMATION_DESIGN_VALUES`

## Implementation Steps
1. Refactor shared/type-specific design types in `types.ts`.
2. Keep newsletter design tab composition unchanged.
3. Add automation-specific design tab composition with:
   - Global: background, heading font, heading weight, body font
   - Header: header background color
   - Body: heading color, button/link/image/divider controls
4. Keep controller generic; adapter selects tab composition.
5. Update automation adapter create/save/preview mapping to remove removed fields.
6. Split preview color helpers:
   - `resolveNewsletterPreviewColors(...)`
   - `resolveAutomationPreviewColors(...)`
7. Update automation preview:
   - Remove post-title/alignment behavior
   - `H1` top heading (`Welcome email`)
   - `H2` section heading (`Need inspiration?`)
   - Apply heading color from `section_title_color`
   - Header region wraps header image/publication title/H1
   - Add `data-testid="automation-preview-header-region"`
8. Rename automation design label:
   - `Section title color` -> `Heading color`

## Test Plan
1. Adapter tests: automation no longer depends on `post_title_color`/`title_alignment`.
2. Design tab tests:
   - Automation omits `Post title color` and `Title alignment`
   - Automation shows `Heading color`
   - Newsletter still shows newsletter-only controls
3. Preview tests:
   - `Welcome email` is `H1`
   - `Need inspiration?` is `H2`
   - `section_title_color` affects both headings
   - Header region background color visible with header image/title block
4. Store tests:
   - Legacy keys are ignored when read
5. Regression:
   - Newsletter design/preview behavior remains unchanged

## Verification Commands
1. `yarn workspace @tryghost/admin-x-settings test:unit test/unit/customization`
2. `yarn eslint apps/admin-x-settings/src/components/settings/email/customization apps/admin-x-settings/test/unit/customization`
