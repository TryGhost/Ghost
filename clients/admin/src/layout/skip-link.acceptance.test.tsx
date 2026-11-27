import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagsScreen } from '@/tags/tags.screen';

const skipLink = () => page.getByRole('button', { name: 'Skip to main content' });

function widthOf(element: Element): number {
  return element.getBoundingClientRect().width;
}

describe('Skip link', () => {
  it('is the first tab stop, shows only while focused, and moves focus to the main content', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');
    await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();

    const link = skipLink().element();
    expect(widthOf(link)).toBeLessThanOrEqual(1);

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();

    expect(document.activeElement).toBe(link);
    expect(widthOf(link)).toBeGreaterThan(1);

    await userEvent.keyboard('{Enter}');

    const main = document.activeElement as HTMLElement;
    expect(main.tagName).toBe('MAIN');
    expect(main.contains(tagsScreen.emptyStateHeading().element())).toBe(true);
    expect(sidebarScreen.shellNav().element().contains(main)).toBe(false);
    expect(widthOf(link)).toBeLessThanOrEqual(1);

    await userEvent.tab();

    expect(main.contains(document.activeElement)).toBe(true);
    expect(main.hasAttribute('tabindex')).toBe(false);
  });
});
