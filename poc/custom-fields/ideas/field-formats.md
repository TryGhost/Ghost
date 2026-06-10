# Idea / future task: field formats (validated types) + presets

**Status:** Backlog. Not in the POC. Capture for later, if we like the overall flow.

Two distinct, deferred concepts that came up while discussing presets. Keeping them separate matters.

## 1. Formats (validated types)

Some fields aren't just "text", they carry their own **validation / formatting / input affordance**: phone, email, URL. That's *behavior*, not convenience.

**Model:** a base `type` (text / number / boolean / select) plus an optional **`format`** that refines a text field (`email`, `phone`, `url`, …). Mirrors HTML `input type` and JSON Schema's `format`. Clean and extensible.

**UI:** don't expose "format" as a concept. Surface them as more **data types** in the dropdown, Text, Email, URL, Phone, Number, True/False, List, where Email/URL/Phone are "text + a validator" under the hood. Simple for the user, clean in the model.

**Candidates / reality check:**
- **URL** — easy; the design system already has `URLTextField`.
- **Email** — trivial validation.
- **Phone** — locale-heavy formatting; doable but more work.
- **Address** — weak as a single validated string; it's really multi-line text or a *composite* (street/city/zip). Treat as plain text or defer.

## 2. Presets (deferred, not dropped)

Pure convenience: one click creates a field with a suggested **name + type (+ format)** pre-filled. No new behavior. Useful later for things we know publishers want.

**Why deferred for the POC:** name-style presets (First/Last/Full name) clash with Ghost's built-in `name` (two name sources). Once formats exist, the useful presets are the gap-fillers (Phone, Company, Job title, Country, Website), and a preset could pre-pick a format (e.g. a "Phone" preset → text + phone format).

## Relationship

Orthogonal. A **format** is how a field validates; a **preset** is a one-click way to create a field (and could choose a format). Either can ship without the other.

## Not now

Both are out of scope for the POC. Revisit if the core loop (Stories 1–4) proves the experience is worth productionising.
