import type React from 'react';
import { ListPage } from '@/components/page-templates/list-page';
import { PageChromeProvider } from '@/components/page-templates/large-page-title';
import { PageHeader } from '@/components/patterns/page-header';
import { render, screen } from '../../utils/test-utils';

function MembersPage({ withTitle = true }: { withTitle?: boolean }) {
  return (
    <ListPage data-testid="list-page">
      <ListPage.Header data-testid="list-page-header">
        <PageHeader blurredBackground={false} sticky={false}>
          <PageHeader.Left>
            {withTitle ? (
              <PageHeader.Title>
                Members <PageHeader.Count>12</PageHeader.Count>
              </PageHeader.Title>
            ) : (
              <span>Members › Jamie</span>
            )}
          </PageHeader.Left>
        </PageHeader>
      </ListPage.Header>
    </ListPage>
  );
}

describe('ListPage large titles', () => {
  it.each([
    ['without a provider', (page: React.ReactElement) => page],
    [
      'with large titles off',
      (page: React.ReactElement) => (
        <PageChromeProvider value={{ largeTitles: false }}>{page}</PageChromeProvider>
      ),
    ],
  ])('renders the usual list page %s', (_, wrap) => {
    render(wrap(<MembersPage />));

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings.length).toBe(1);
    expect(headings[0].getAttribute('data-page-header')).toBe('title');
    expect(headings[0].hasAttribute('aria-hidden')).toBe(false);

    const listPage = screen.getByTestId('list-page');
    expect(listPage.hasAttribute('data-large-title-host')).toBe(false);
    expect(listPage.querySelector('[data-list-page=large-title]')).toBeNull();
    expect(listPage.style.getPropertyValue('--list-page-header-height')).toBe('');
    expect(screen.getByTestId('list-page-header').hasAttribute('data-large-title-header')).toBe(
      false,
    );
  });

  it('shows the title large above the header, its header copy a hidden stand-in', () => {
    render(
      <PageChromeProvider value={{ largeTitles: true }}>
        <MembersPage />
      </PageChromeProvider>,
    );

    // The one heading assistive technology gets is the large title, count included
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.getAttribute('data-large-title')).toBe('');
    expect(heading.textContent ?? '').toMatch(/Members\s*12/);

    const standIn = screen
      .getByTestId('list-page-header')
      .querySelector('[data-page-header=title]');
    expect(standIn?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('list-page').hasAttribute('data-large-title-host')).toBe(true);
    expect(screen.getByTestId('list-page-header').hasAttribute('data-large-title-header')).toBe(
      true,
    );
  });

  it('keeps the usual header for a page without a title', () => {
    render(
      <PageChromeProvider value={{ largeTitles: true }}>
        <MembersPage withTitle={false} />
      </PageChromeProvider>,
    );

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    // Its table labels still stick beneath the header
    expect(screen.getByTestId('list-page').hasAttribute('data-large-title-host')).toBe(true);
    expect(screen.getByTestId('list-page-header').hasAttribute('data-large-title-header')).toBe(
      false,
    );
  });
});
