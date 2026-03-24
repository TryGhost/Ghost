# Email Templates Design

## Overview

Add a reusable `email_templates` table to persist email design settings (colors, fonts, layout options) and general settings (header image, footer, badge visibility). This decouples visual design from email content, allowing multiple email types (welcome emails, newsletters, future transactional emails) to share templates.

## Current State

- `automated_emails` table stores welcome email content (subject, lexical, sender info)
- Welcome email customize modal (`welcome-email-customize-modal.tsx`) has design/general fields but does NOT persist them (TODO at line 200)
- Newsletters table has identical design columns inline — the template table unifies this pattern

## Database Schema

### New table: `email_templates`

| Column | Type | Nullable | Default | Validations |
|---|---|---|---|---|
| `id` | string(24) | no | — | Primary key |
| `name` | string(191) | no | — | Unique |
| `slug` | string(191) | no | — | Unique |
| **General settings** | | | | |
| `header_image` | string(2000) | yes | null | |
| `show_publication_title` | boolean | no | true | |
| `show_badge` | boolean | no | true | |
| `footer_content` | text(longtext) | yes | null | |
| **Design settings** | | | | |
| `background_color` | string(50) | no | `'#ffffff'` | |
| `title_font_category` | string(191) | no | `'sans_serif'` | isIn: serif, sans_serif |
| `title_font_weight` | string(50) | no | `'bold'` | isIn: normal, medium, semibold, bold |
| `body_font_category` | string(191) | no | `'sans_serif'` | isIn: serif, sans_serif |
| `header_background_color` | string(50) | no | `'#ffffff'` | |
| `title_alignment` | string(191) | no | `'center'` | isIn: center, left |
| `post_title_color` | string(50) | yes | null | |
| `section_title_color` | string(50) | yes | null | |
| `button_color` | string(50) | yes | `'accent'` | |
| `button_style` | string(50) | no | `'fill'` | isIn: fill, outline |
| `button_corners` | string(50) | no | `'rounded'` | isIn: square, rounded, pill |
| `link_color` | string(50) | yes | `'accent'` | |
| `link_style` | string(50) | no | `'underline'` | isIn: underline, regular, bold |
| `image_corners` | string(50) | no | `'square'` | isIn: square, rounded |
| `divider_color` | string(50) | yes | null | |
| **Timestamps** | | | | |
| `created_at` | dateTime | no | — | |
| `updated_at` | dateTime | yes | — | |

Indexes: `['slug']`

### Modified table: `automated_emails`

Add column:

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `email_template_id` | string(24) | yes | null | References `email_templates.id` |

## Migrations

Three sequential migrations:

1. **Add `email_templates` table** — creates the table with all columns
2. **Add `email_template_id` to `automated_emails`** — adds the FK column
3. **Seed default template and link automated emails** — creates a `default` template row and updates both automated_email rows to reference it

## API Design

### New endpoint: `GET/PUT /email_templates/`

| Action | Method | Path |
|---|---|---|
| Browse | GET | `/email_templates/` |
| Read | GET | `/email_templates/:id/` |
| Edit | PUT | `/email_templates/:id/` |

No create/delete for now — templates are seeded, users edit the default. Create/delete can be added later for multiple template support.

### Changes to `/automated_emails/`

- Response payload includes `email_template_id`
- Edit accepts `email_template_id` to associate a template

## Backend Implementation

| File | Action | Purpose |
|---|---|---|
| `ghost/core/core/server/data/schema/schema.js` | Edit | Add `email_templates` table, add `email_template_id` to `automated_emails` |
| `ghost/core/core/server/data/migrations/versions/6.*/` | Create (x3) | Three migrations |
| `ghost/core/core/server/models/email-template.js` | Create | Bookshelf model |
| `ghost/core/core/server/models/automated-email.js` | Edit | Add relationship to email_template |
| `ghost/core/core/server/api/endpoints/email-templates.js` | Create | API controller (browse, read, edit) |
| `ghost/core/core/server/api/endpoints/index.js` | Edit | Register endpoint |

## Frontend Implementation

| File | Action | Purpose |
|---|---|---|
| `apps/admin-x-framework/src/api/email-templates.ts` | Create | TypeScript types + React Query hooks |
| `apps/admin-x-settings/.../welcome-email-customize-modal.tsx` | Edit | Wire up to email_templates API |

## Design Decisions

- **Individual columns over JSON** — matches newsletters pattern, enables DB-level validation, consistent with existing codebase
- **Separate table over extending automated_emails** — reusable across email types (newsletters will get `email_template_id` FK later)
- **Sender fields stay on automated_emails** — sender identity is per-email-type, not per-template
- **Seeded default template** — avoids "create on first use" logic; always has a template to read/edit
- **No create/delete API yet** — YAGNI; single default template is sufficient for current needs
