# Settings-on-Shade — definitive parity evidence

One sweep, both lanes, same fixtures. Every screenshot pair below was
captured by a single evidence spec run against the acceptance harness
(fake Ghost Admin API, deterministic fixtures, 1280×800 viewport; the
mobile pair at 375×812), once per lane:

```
# from apps/admin, with the evidence spec present (see "Regenerating")
pnpm exec vitest run -c vitest.acceptance.config.ts src/settings/evidence
SHADE_SETTINGS=1 pnpm exec vitest run -c vitest.acceptance.config.ts src/settings/evidence
```

- `off/` — legacy settings app (`apps/admin-x-settings`), the flag-off lane
- `on/` — native Shade settings (`apps/admin/src/settings/`), flag-on

Fixtures shared by every screen: Stripe connected, one paid tier
(Supporter), three offers (two signup + monthly retention redemptions),
two newsletters (active + archived), one custom integration, two
recommendations, staff owner user. Both lanes render identical data, so
differences are UI-only.

**Test-suite backstop.** Every behavioral contract in these screens is
additionally covered by the dual-mode acceptance suites: the full
`src/settings` run is green in both lanes (309 passed flag-off, 309
passed flag-on, **zero flag-on skips**). Screenshot verdicts below grade
structure/layout; behavior parity is the suites' job.

## Regenerating

The generator spec is archived as `evidence.acceptance.test.tsx.txt` next
to this file. Copy it to `apps/admin/src/settings/evidence.acceptance.test.tsx`,
run the two commands above, then delete it (it is intentionally not part
of the committed suites so the definitive test counts stay unpolluted).

## Per-screen verdicts

Verdicts: **parity** = same structure, content and interaction surface
(shade design language differences only); **parity + delta** = parity
with an intentional, documented difference listed in the notes.

| Screen | Pair | Verdict | Notes |
| --- | --- | --- | --- |
| General area | `area-general.png` | parity | Scroll-spy highlights the group in view (ported this phase). Nav items lose the legacy mini-icons; group titles uppercase — shade sidebar language. |
| Site area | `area-site.png` | parity | |
| Membership area | `area-membership.png` | parity | Same group order incl. cross-area spam filters/tips (legacy composition). |
| Email area | `area-email.png` | parity | Automations-off composition; the automations-on tabbed variant is suite-covered (email-settings suite). |
| Growth area | `area-growth.png` | parity | Offers group present (Stripe fixtures on). |
| Advanced area | `area-advanced.png` | parity | Integrations list, migration tools, code injection, labs, history, danger zone. |
| Design dialog | `dialog-design.png` | parity | Preview pane + device toggle + View site + brand sidebar. Sidebar column slightly wider in native. |
| Announcement bar | `dialog-announcement-bar.png` | parity | Native Koenig editor lane (no legacy HtmlField). |
| Theme gallery | `dialog-theme-gallery.png` | parity | Official gallery variant loop + installed list. |
| Theme preview | `dialog-theme-preview.png` | parity + delta | Breadcrumb trail without the legacy back-arrow glyph; Install button is shade primary (black) not green. |
| Theme code editor | `dialog-theme-code-editor.png` | parity + delta | IDE surface is deliberately fixed-light; file tree/toolbar reuse legacy components by design (phase 3). |
| Navigation dialog | `dialog-navigation.png` | parity | dnd-kit reordering, URL semantics from legacy modules. |
| Portal dialog | `dialog-portal.png` | parity | Same preview mechanism (legacy getPortalPreviewUrl). |
| Tier detail | `dialog-tier-detail.png` | parity | Benefits reordering, pending-benefit fold-in (suite-pinned). |
| Stripe connect | `dialog-stripe-connect.png` | parity | Connected state (fixtures connect Stripe); all four legacy states suite-covered. |
| Newsletter detail | `dialog-newsletter-detail.png` | parity + delta | PreviewDialog adds the desktop/mobile device toolbar where legacy hid it (documented phase-5 delta). |
| Newsletter add | `dialog-newsletter-add.png` | parity | |
| Offers index | `dialog-offers-index.png` | parity + delta | Row order identical incl. the unified signup+retention sort ported from main's #29534. Full-screen dialog instead of the legacy floating modal card; New offer button shade-primary not green; sort/show-archived state is dialog-local (phase-6 delta). |
| Offer add | `dialog-offer-add.png` | parity + delta | Standard preview toolbar + device toggle added where legacy had none (phase-6 delta). |
| Offer edit | `dialog-offer-edit.png` | parity | |
| Offer success | `dialog-offer-success.png` | parity | Brand share icons are inline SVGs (lucide dropped brand icons). |
| Recommendation add | `dialog-recommendation-add.png` | parity | Two-step flow in one routed dialog (URL → confirm), same testids. |
| Embed signup | `dialog-embed-signup.png` | parity | No acceptance suite (legacy had none either) — screenshot-only evidence. |
| Integration: Zapier | `dialog-integration-zapier.png` | parity | Shared integration-dialog chrome; API-key row on shade CopyField. |
| Integration: custom | `dialog-integration-custom.png` | parity | |
| Code injection | `dialog-code-injection.png` | parity + delta | Editors deliberately fixed-light (phase-7 delta). |
| History | `dialog-history.png` | parity | Filters, grouped rows, staff filter; infinite scroll suite-covered. |
| Staff detail | `dialog-staff-detail.png` | parity | Routed dialog; deep links + slug-change replace suite-covered. |
| Staff invite | `dialog-staff-invite.png` | parity | |
| About Ghost | `dialog-about.png` | parity | Ported this phase (sidebar entry + `/settings/about`). Upgrade-status banner not ported: the React admin never provides `upgradeStatus`, so it never rendered in either lane. |
| Mobile layout | `mobile-settings.png` | parity + delta | Legacy contract ported this phase: fixed search bar, nav hidden, stacked sections, exit stays top-right. Delta: native group headers wrap narrower at 375px than legacy. |

## Known deltas (consolidated)

Intentional, documented differences between the lanes — everything else
in the table above is structural parity:

1. **Shade design language**: primary buttons are shade-primary (black)
   where legacy used green; sidebar group titles uppercase; no nav item
   icons; SettingValue headings uppercase. Applies across screens.
2. **PreviewDialog device toolbar** added to newsletter detail and
   add-offer where legacy hid the toolbar (phases 5/6).
3. **Offers sort/show-archived state is dialog-local** — resets when the
   index closes; legacy persisted it in a provider (phase 6).
4. **Fixed-light editor surfaces**: email preview and the CodeMirror
   editors (code injection, redirects/routes YAML, theme editor) stay
   light in dark mode (phases 5/7).
5. **Feature-toggle confirmation testid** is the shared
   `confirmation-modal`, not the legacy `feature-toggle-confirmation-modal`
   (phase 7; no suite asserts the old id).
6. **Verification prompts**: newsletter-name links inside confirmation
   prompts navigate but leave the confirmation open behind its Close
   button (phase 5, minor).
7. **Labs auto-expand + search registration ported this phase**; the
   legacy `highlightKeywords` renderer was found to be dead code (defined
   but consumed by no legacy component), so no keyword highlighting
   exists to port in either lane.
8. **Pintura wiring ported this phase**: the integrations card Active
   state is live (script/css load probing) and image uploads get the
   edit affordance (Meta data Facebook/X images, publication cover,
   staff profile/cover). Not screenshot-covered — requires a real
   Pintura script; config-gated exactly like legacy.
9. **About Ghost upgrade-status banner** not ported (never rendered in
   the React admin in either lane).

## Flag-on skip list

Empty. Every `src/settings` acceptance suite runs and passes in both
lanes (39 files, 309 tests per lane). The full apps/admin acceptance
config flag-on additionally reports 73 skips — those are the non-settings
suites (analytics, members, posts, …), which the `SHADE_SETTINGS=1`
harness skips by design because they haven't opted into the dual-mode
mechanism; they are out of scope for the settings spike and all pass in
the default lane (382/382).
