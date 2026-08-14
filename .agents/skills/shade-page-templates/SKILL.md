---
name: Shade page templates
description: Pick the right Shade page template (ListPage, PageHeader) for a new admin page instead of inventing chrome. Trigger when creating new admin pages or routes in apps/admin, apps/admin-x-settings, apps/posts, apps/stats, apps/activitypub.
autoTrigger:
  - fileEdit: "apps/{admin,admin-x-settings,activitypub,posts,stats}/src/**/*.tsx"
---

# Shade — page templates

When building a new admin page, the first question is **what page type is this?** — then reach for the matching pattern instead of inventing chrome.

## Page type taxonomy

### List page

Browsing or scanning a collection of items.

- **Live examples**: Members, Tags, Comments, Automations, ActivityPub.
- **Chrome shape**: `PageHeader` (title + count + search/filter/actions) → table or list → empty state → pagination.
- **Pattern**: `ListPage` (composes `PageHeader`). Heavy filter UI uses `Filters`.

### Detail page

Working with a single item — viewing, editing, or both.

- **Live examples**: Post editor.
- **Chrome shape**: `PageHeader` with breadcrumb + title + meta, a primary action area, and a content area dedicated to the item.
- **Pattern**: not built this milestone. Use `PageHeader` directly and lay out the body yourself.

### Settings

Out of scope for the current page-template milestone. Don't force a settings page into `ListPage` or `PageHeader`.

### Workflow / multi-step flows

No standard yet — too few examples. Don't standardise prematurely.

## Canonical list page skeleton

```tsx
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader, ViewBar, FilterBar} from '@tryghost/shade/patterns';
import {Button, EmptyIndicator, Table} from '@tryghost/shade/components';

<ListPage>
  <ListPage.Header>
    {/* sticky={false} — ListPage.Header owns stickiness and blur */}
    <PageHeader sticky={false} blurredBackground={false}>
      <PageHeader.Left>
        <PageHeader.Title>
          Members<PageHeader.Count>{count}</PageHeader.Count>
        </PageHeader.Title>
      </PageHeader.Left>
      <PageHeader.Actions>
        <PageHeader.ActionGroup>
          <Button>Add member</Button>
        </PageHeader.ActionGroup>
      </PageHeader.Actions>
    </PageHeader>
    <ViewBar>{/* optional */}</ViewBar>
    <FilterBar>{/* optional — auto-collapses when empty */}</FilterBar>
  </ListPage.Header>
  <ListPage.Body>
    {items.length === 0 ? <EmptyIndicator title='No members yet' /> : <Table>...</Table>}
  </ListPage.Body>
</ListPage>
```

## Gotchas

- **`sticky={false}` on `PageHeader` inside `ListPage.Header`.** The wrapper handles stickiness and blur — leaving `PageHeader` sticky stacks two sticky containers and breaks scroll.
- **Don't put `useQuery` inside a pattern.** State lives in the consumer. Patterns are layout/composition contracts.
- **`PageHeader` is slot-based** (`.Left`, `.Title`, `.Count`, `.Description`, `.Meta`, `.Actions`, `.ActionGroup`, `.Breadcrumb`) — don't pass a prop bag.
- **`FilterBar` auto-collapses when empty** — render it unconditionally; no need to conditionally mount.

## Subcomponent inventory (PageHeader)

- `PageHeader.Left` — title block container
- `PageHeader.Breadcrumb` — small muted breadcrumb above the title
- `PageHeader.Title` — H1, accepts inline `Count`
- `PageHeader.Count` — inline secondary count next to the title
- `PageHeader.Description` — paragraph below the title
- `PageHeader.Meta` — small muted metadata line below
- `PageHeader.Actions` — right-side action area
- `PageHeader.ActionGroup` — grouping for buttons

## When ListPage doesn't fit

- The page is a **Detail page** → use `PageHeader` directly; build the body from primitives + components.
- The page is **Settings** → out of scope; use whatever the surrounding settings shell uses.
- The page is a **multi-step flow** → no pattern yet; assemble from primitives.

If you're tempted to force a non-list shape into `ListPage`, stop and check whether you're actually building one of those three other shapes.

## Source of truth

`apps/shade/AGENTS.md`. Human docs: Storybook → Page Templates / Page Types.
