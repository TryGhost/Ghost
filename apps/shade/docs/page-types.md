# Page types in Ghost Admin

A small vocabulary for naming the kinds of pages Ghost Admin has. The point isn't to enforce a framework — it's so a designer or AI agent can identify what kind of page they're building, and reach for the right Shade pattern instead of inventing chrome from scratch.

When a new feature shows up, the first question is **"what page type is this?"**. The second is **"is it really that, or is it being pushed into Settings by default?"**.

## The page types

### List page

Browsing or scanning a collection of items.

**Live examples**: Members, Tags, Comments, Automations, ActivityPub followers/feed.

**Chrome shape**: `PageHeader` (title + count + search/filter/actions inside `ActionGroup`) → table or list → empty state → pagination.

**Shade pattern**: [`ListPage`](../src/components/patterns/list-page.tsx). Composes [`PageHeader`](../src/components/patterns/page-header.tsx). Bring your own table/list and empty state via [`EmptyIndicator`](../src/components/ui/empty-indicator.tsx). Heavy filter UI uses the existing [`Filters`](../src/components/patterns/filters.tsx) pattern.

### Analytics page

Showing metrics, trends, and ranked content.

**Live examples**: Post Analytics, Site Stats.

**Chrome shape**: `PageHeader` with `Breadcrumb` or `Title`, a `ContextStrip` for live KPIs ("X reading now"), an optional `Hero` for the resource being analysed (feature image + title + meta), and a `Nav` slot for sub-navigation tabs. Below the header: KPI cards, charts, and ranked `DataList`s.

**Shade pattern**: No dedicated wrapper this milestone. Use `PageHeader` for chrome + existing Shade KPI primitives (`KpiCard`, `KpiTabValue`, `MetricValue`, `TrendBadge`) + `DataList` + `GhAreaChart`. Page-level composition lives in the analytics areas (`apps/posts/views/PostAnalytics`, `apps/stats`) — not in Shade.

### Detail page

Working with a single item — viewing, editing, or both.

**Live examples**: Post editor.

**Chrome shape**: `PageHeader` with breadcrumb + title + meta, a primary action area (save/cancel), and a content area dedicated to the item itself.

**Shade pattern**: Not built this milestone. Named here so features can identify the page type and avoid forcing detail flows into modals or Settings.

## What's not in this taxonomy (yet)

**Settings pages** — the entire `apps/admin-x-settings/` app. Out of scope for this milestone. Settings has historically been a dumping ground for unresolved product architecture; the page types above exist partly to give new features somewhere else to live.

**Workflow pages** — onboarding, multi-step flows. There aren't enough live examples to standardise against yet. Add this page type when there are 2+ concrete examples.

## Using the patterns

```tsx
import {ListPage, PageHeader} from '@tryghost/shade/patterns';
import {Button, EmptyIndicator, InputGroup, InputGroupAddon, InputGroupInput, Table /* ... */} from '@tryghost/shade/components';
import {Search} from 'lucide-react';

<ListPage>
  <PageHeader>
    <PageHeader.Left>
      <PageHeader.Title>Members<PageHeader.Count>{count}</PageHeader.Count></PageHeader.Title>
    </PageHeader.Left>
    <PageHeader.Actions>
      <PageHeader.ActionGroup>
        <InputGroup>
          <InputGroupAddon><Search className='size-4' /></InputGroupAddon>
          <InputGroupInput value={search} onChange={e => setSearch(e.target.value)} placeholder='Search members...' />
        </InputGroup>
        <Button>Add member</Button>
      </PageHeader.ActionGroup>
    </PageHeader.Actions>
  </PageHeader>

  <ListPage.Body>
    {items.length === 0 ? <EmptyIndicator title='No members yet' /> : <Table>...</Table>}
  </ListPage.Body>

  <ListPage.Pagination>
    <Button onClick={loadMore}>Load more</Button>
  </ListPage.Pagination>
</ListPage>
```

Run the Shade storybook (`pnpm --filter @tryghost/shade storybook`) to see live shapes for each pattern.

## Migration status

The new patterns live alongside the legacy header primitives (`ListHeader`, `Header`, `ViewHeader` in `@/components/layout/`) for now. No Admin call-sites have been migrated yet — that's a separate follow-up milestone. The legacy primitives stay exported until migration is complete.
