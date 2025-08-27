# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) specific to the E2E test suite.

ADRs are short, version-controlled documents that capture important architectural and process decisions, along with the reasoning behind them.  
They help document **why** something was decided — not just **what** was done — which improves transparency, consistency, and long-term maintainability.

Each ADR includes the following sections:

- `Status` – `Proposed`, `Accepted`, `Rejected`, etc.
- `Context` – Why the decision was needed
- `Decision` – What was decided and why
- `Guidelines` – (Optional) How the decision should be applied
- `Example` – (Optional) Minimal working example to clarify intent
- `References` - (Optional) - Lists documents, links, or resources that informed or support the decision

## Guidelines for contributing

- We follow a simplified and slightly adapted version of the [Michael Nygard ADR format](https://github.com/joelparkerhenderson/architecture-decision-record/tree/main/locales/en/templates/decision-record-template-by-michael-nygard)
- Keep ADRs focused, short, and scoped to one decision
- Start with `Status: Proposed` and update to `Status: Accepted` after code review
- Use sequential filenames with a descriptive slug, for example: `0002-page-objects-pattern.md`
