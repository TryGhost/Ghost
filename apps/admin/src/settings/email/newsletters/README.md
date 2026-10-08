# Newsletter typography

Newsletter fonts are independent of theme fonts and the shared welcome-email
design. Heading and body choices use the existing `title_font_category` and
`body_font_category` string columns. The legacy IDs `serif` and `sans_serif`
remain valid; accepting more IDs changes application validation, not the database
layout, so it needs no migration.

## Font examples

| Choice          | Stack                             | Available heading weights | Additional work                                                                |
| --------------- | --------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| Verdana         | `Verdana, Geneva, sans-serif`     | Regular, Bold             | Register a sans-serif choice; check wider text and line wrapping.              |
| Times New Roman | `'Times New Roman', Times, serif` | Regular, Bold             | Register a serif choice; preserve serif sizing and check smaller-looking text. |

Both examples use fonts installed on the recipient's device. They require no
font download or font assets. When the first font is unavailable, the client uses
the rest of the stack. This means a selected font is not guaranteed on every
device.

## Implementation

- [Core's font registry](../../../../../../ghost/core/core/server/lib/email-rendering/newsletter-fonts.ts)
  supplies font categories, CSS stacks, the validation allowlist, and the
  `newsletterFonts` capability returned by Admin's config endpoint.
- [Admin's font metadata](newsletter-fonts.ts) supplies labels and preview stacks.
  The picker filters these choices against the backend capability. Older servers
  that omit it offer only the original two choices.
- [The detail modal](newsletter-detail-modal.tsx) maps heading weights when a font
  changes. Both example fonts map Medium to Regular and Semi-bold to Bold.
- [The preview](newsletter-preview-content.tsx) applies the selected stack to
  titles, excerpts, content headings, and body text.
- Core's email renderer resolves font IDs to trusted CSS. Its newsletter template
  inlines the chosen stacks, including table cells whose default font would
  otherwise override inherited body typography. Existing card-specific design
  styles and utility text can retain their own typography.

The shared wiring is the larger part of these examples. As an engineering
estimate, allow 1–2 days for the first small set including implementation and
email-client QA, then a few hours to half a day for each similar system font.
These are planning estimates, not measured delivery commitments.

## Downloaded fonts

A font such as Inter requires an additional path: licensed assets with stable
HTTPS URLs, weight and italic coverage, preview loading, `@font-face` declarations
that survive email processing, and explicit client fallbacks. The theme-font
loader alone does not provide email support.

Gmail generally ignores downloaded fonts, and some Outlook versions mishandle
their fallback stacks. Consult the [email-client test results](https://www.caniemail.com/features/css-at-font-face/).
Treat a web font as progressive enhancement. Budget several days for the first
web-font path and client QA; subsequent fonts reuse that path but still need
asset, fallback, weight, and layout checks.

## Verification

The newsletter acceptance suite covers selecting, previewing, saving, weight
choices, and older-backend compatibility. Core unit tests cover allowed font IDs,
rejection of arbitrary CSS, mixed heading/body choices, and final inlined HTML.

For manual verification, start `pnpm dev:fake-mailgun`, open Settings → Email
newsletters → a newsletter → Design, select fonts, and send a test newsletter to
the local Mailpit inbox. Before shipping, inspect a representative post with
cards, long headings, bold/italic text, lists, and non-Latin text in real email
clients, including Gmail, Apple Mail, and Outlook. A browser preview cannot prove
email-client rendering.
