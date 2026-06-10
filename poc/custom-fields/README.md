# Member custom fields — POC

A usability POC for letting site owners define **custom fields** on members (beehiiv-style), set values per member, collect them at signup, and let members self-edit them on the account page.

**This folder is intentionally separate from the repo's `docs/`** (which is Ghost contributor docs) so the POC does not conflict with it.

## What this POC is and is not

- **Is:** a UX/usability test of the full custom-fields flow, with data faked in the browser.
- **Is not:** backend, DB schema, migrations, or API work. All data lives in localStorage behind an async repository facade, seeded from `custom-fields.seed.json`. We assume the data is "already queried and available to the FE." When the real backend lands, only the repository module changes.

Branch: `poc/member-custom-fields`.

## Files

| File | Purpose |
| --- | --- |
| [`ROADMAP.md`](./ROADMAP.md) | Ordered stories + status. The deliberate plan we work through. |
| [`data-model.md`](./data-model.md) | The agreed schema: field definitions, type catalog, value shapes, presets, storage. |
| [`custom-fields.seed.json`](./custom-fields.seed.json) | Initial seed data (field definitions + per-member values). |
| [`stories/`](./stories/) | One file per story with tasks, scope, and a demo script. |
| [`LEARNINGS.md`](./LEARNINGS.md) | What the POC surfaced that should inform a real implementation. |
| [`ideas/`](./ideas/) | Future-task write-ups (e.g. the post-signup survey surface). |

## How we work

One story at a time, in the order defined in [`ROADMAP.md`](./ROADMAP.md). Each story has its own checklist and a "done = demoable" bar. We do not start the next story until the current one is demoable.

The loop for each task:

1. **Build** the story against the constraints (reuse existing components, no new deps).
2. **Hand off for manual test.** Do not commit until it is tested and approved.
3. **Commit** locally once approved (never push without explicit permission).
4. **Update [`LEARNINGS.md`](./LEARNINGS.md)** with anything the task surfaced that should inform a real implementation. This happens at the end of *every* task, not just once.
5. Move to the next story.
