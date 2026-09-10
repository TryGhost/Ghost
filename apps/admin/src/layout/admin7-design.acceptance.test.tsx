import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  comment,
  fakeAdminEndpoint,
  fakeComments,
  fakeMembers,
  fakePosts,
  fakePostsListScreen,
  fakeTags,
  label,
  member,
  post,
  renderAdminApp,
  tag,
} from '@test-utils/acceptance';
import { commentsScreen } from '@/comments/comments.screen';
import { membersScreen } from '@/members/members.screen';
import { postsListScreen } from '@/posts/list/posts-list.screen';
import { tagsScreen } from '@/tags/tags.screen';
import { tagDetailScreen } from '@/tags/detail/tag-detail.screen';
import { sidebarScreen } from './sidebar.screen';

// Previous values are taken from main's rendered utility contracts: rounded-md
// (6px), row ms-2 (8px), outline border (1px), and the original INTERNAL badge.
// The browser harness uses a 16px root, while the production host uses 10px.
// Normalize rem-based dimensions without changing the host font size.
// Assert browser-computed outcomes so token/provider/portal changes cannot pass
// merely because a feature class or conditional branch still exists.

function inRem(value: string): number {
  return Number(
    (parseFloat(value) / parseFloat(getComputedStyle(document.documentElement).fontSize)).toFixed(
      4,
    ),
  );
}

const designs = [
  { name: 'flag absent', labs: {}, current: false },
  { name: 'flag disabled', labs: { admin7Pill: false }, current: false },
  { name: 'flag enabled', labs: { admin7Pill: true }, current: true },
] as const;

describe.each(designs)('Admin design compatibility: $name', ({ labs, current }) => {
  it('preserves the post row action layout and destination for its design', async () => {
    fakePostsListScreen();
    const draft = post({ title: 'A draft to edit', status: 'draft' });
    fakePosts([draft]);
    await renderAdminApp('/posts?type=draft', { labs: { postsListReact: true, ...labs } });

    const action = postsListScreen.rowAction().first();
    await expect.element(action).toBeVisible();
    await expect.element(action).toHaveAttribute('href', `#/editor/post/${draft.id}`);
    await expect
      .poll(() => inRem(getComputedStyle(action.element()).marginInlineStart))
      .toBe(current ? 3.2 : 0.8);
    await expect
      .poll(() => getComputedStyle(action.element()).borderTopWidth)
      .toBe(current ? '0px' : '1px');
    if (!current) {
      expect(inRem(getComputedStyle(action.element()).borderRadius)).toBe(0.6);
      expect(inRem(getComputedStyle(action.element()).paddingInlineStart)).toBe(1.6);
    }
  });

  it('keeps the previous tag row edit affordance until the design is enabled', async () => {
    fakeTags([tag({ name: 'Design', slug: 'design' })]);
    await renderAdminApp('/tags', { labs });

    const row = tagsScreen.tagRows().first();
    await expect.element(row).toBeVisible();
    await expect.element(tagsScreen.link('Design')).toHaveAttribute('href', '#/tags/design');
    expect(row.element().querySelectorAll('button')).toHaveLength(current ? 0 : 1);
    if (!current) {
      const edit = row.element().querySelector('button')!;
      expect(inRem(getComputedStyle(edit).borderRadius)).toBe(0.6);
      expect(inRem(getComputedStyle(edit).width)).toBeCloseTo(3.6, 2);
      expect(edit.tabIndex).toBe(-1);
    }
  });

  it('keeps label editing layout and submission compatible', async () => {
    const original = label({ name: 'Original label', slug: 'original-label' });
    const selected = label({ name: 'Selected label', slug: 'selected-label' });
    fakeMembers([member()], { labels: [original, selected] });
    const edit = fakeAdminEndpoint('PUT', `/labels/${original.id}/`, ({ body }) => body);
    await renderAdminApp('/members', { labs });

    await membersScreen.addMultiselectFilter('Label', ['Selected label']);
    await membersScreen.openMultiselectValue('Selected label');
    await page.getByRole('button', { name: 'Edit label Original label' }).click();
    const input = page.getByRole('textbox').last();
    await expect.element(input).toHaveFocus();
    const row = input.element().closest('[data-edit-row]')!;
    expect(inRem(getComputedStyle(row).paddingTop)).toBe(current ? 0.4 : 0.6);
    expect(inRem(getComputedStyle(row).paddingBottom)).toBe(current ? 0.8 : 0.6);
    expect(inRem(getComputedStyle(input.element()).borderRadius)).toBe(current ? 0.6 : 0.4);
    await input.fill('Renamed label');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect
      .poll(() => edit.lastRequest?.body)
      .toEqual({ labels: [{ id: original.id, name: 'Renamed label' }] });
  });

  it('preserves tag badge copy and portaled menu geometry', async () => {
    const internalTag = tag({ name: '#Design', slug: 'hash-design', visibility: 'internal' });
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${internalTag.slug}/`), {
      tags: [internalTag],
    });
    await renderAdminApp(`/tags/${internalTag.slug}`, { labs: { tagDetailsReact: true, ...labs } });

    await expect
      .element(tagDetailScreen.internalBadge())
      .toHaveTextContent(current ? 'Internal' : 'INTERNAL');
    if (!current) {
      expect(getComputedStyle(tagDetailScreen.internalBadge().element()).fontSize).toBe('10px');
    }
    await tagDetailScreen.actionsButton().click();
    await expect.element(tagDetailScreen.deleteTagMenuItem()).toBeVisible();
    const menu = page.getByRole('menu');
    await expect
      .poll(() => inRem(getComputedStyle(menu.element()).borderRadius))
      .toBe(current ? 1 : 0.6);
    await expect.element(tagDetailScreen.viewPostsMenuItem()).toHaveAttribute('target', '_blank');
  });
});

describe.each(['/site', '/posts'])('Excluded route %s', (route) => {
  it('keeps portaled shell menus in the previous design even with the flag enabled', async () => {
    // postsListReact/editorReact are absent, so the route belongs to Ember.
    await renderAdminApp(route, { labs: { admin7Pill: true } });
    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
    await expect
      .poll(() => inRem(getComputedStyle(page.getByRole('menu').element()).borderRadius))
      .toBe(0.6);
  });
});

it('keeps the editor host in the previous design when the private flag is enabled', async () => {
  await renderAdminApp('/editor/post/new', { labs: { admin7Pill: true } });
  await expect.poll(() => document.querySelector('[data-react-admin-mounted]')).not.toBeNull();
  const root = document.querySelector('[data-react-admin-mounted]')!;
  expect(getComputedStyle(root).getPropertyValue('--radius-menu').trim()).toBe('0.6rem');
});

// postsListReact already changes the previous filter affordances independently
// of Admin 7. Keep both established configurations when Admin 7 is disabled.
describe.each([false, true])(
  'Previous filter compatibility: postsListReact=%s',
  (postsListReact) => {
    const labs = { admin7Pill: false, postsListReact };

    it('preserves Members add-filter and Clear controls', async () => {
      fakeMembers([member({ name: 'Free member', status: 'free' })]);
      await renderAdminApp('/members?filter=status:free', { labs });
      const add = page.getByRole('button', { name: 'Add filter', exact: true });
      const clear = page
        .getByTestId('members-filter-actions')
        .getByRole('button', { name: 'Clear', exact: true });
      await expect.element(add).toBeVisible();
      await expect.element(clear).toBeVisible();
      expect(
        add
          .element()
          .querySelector(postsListReact ? '.lucide-list-filter-plus' : '.lucide-funnel-plus'),
      ).not.toBeNull();
      expect(getComputedStyle(clear.element()).borderTopWidth).toBe(postsListReact ? '1px' : '0px');
      expect(clear.element().querySelectorAll('svg')).toHaveLength(postsListReact ? 0 : 1);
      expect(getComputedStyle(clear.element()).fontWeight).toBe(postsListReact ? '500' : '400');
      await clear.click();
      await expect.element(page.getByRole('button', { name: 'Filter', exact: true })).toBeVisible();
      await expect.element(clear).not.toBeInTheDocument();
    });

    it('preserves Comments filter controls and existing default tooltips', async () => {
      const author = { ...member({ name: 'Comment author' }), can_comment: false };
      const entity = comment({
        html: '<p>Existing comment</p>',
        member: author,
      });
      fakeComments([entity]);
      await renderAdminApp('/comments?filter=status:published', { labs });
      const add = page.getByRole('button', { name: 'Add filter', exact: true });
      const clear = page.getByRole('button', { name: 'Clear', exact: true });
      await expect.element(add).toBeVisible();
      await expect.element(clear).toBeVisible();
      expect(
        add
          .element()
          .querySelector(postsListReact ? '.lucide-list-filter-plus' : '.lucide-funnel-plus'),
      ).not.toBeNull();
      expect(getComputedStyle(clear.element()).borderTopWidth).toBe(postsListReact ? '1px' : '0px');
      expect(clear.element().querySelectorAll('svg')).toHaveLength(postsListReact ? 0 : 1);
      await commentsScreen.commentRow('Existing comment').commentingDisabledIndicator().hover();
      const tooltip = page.getByRole('tooltip');
      await expect.element(tooltip).toHaveTextContent('Comments disabled');
      // The original dark surface has no shadow; Admin 7's white surface does.
      const tooltipSurface = tooltip.element().closest('[data-side]')!;
      expect(getComputedStyle(tooltipSurface).boxShadow).toBe('none');
      expect(tooltipSurface).toHaveClass('bg-primary');
      await clear.click();
      await expect.element(commentsScreen.filterButton()).toBeVisible();
      await expect.element(clear).not.toBeInTheDocument();
    });
  },
);
