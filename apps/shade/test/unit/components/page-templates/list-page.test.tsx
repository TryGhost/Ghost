import assert from 'assert/strict';
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
  it('shows the title in the header as usual without large titles', () => {
    render(<MembersPage />);

    const headings = screen.getAllByRole('heading', { level: 1 });
    assert.equal(headings.length, 1);
    assert.equal(headings[0].getAttribute('data-page-header'), 'title');
    assert.equal(
      screen.getByTestId('list-page-header').hasAttribute('data-large-title-header'),
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
    assert.equal(heading.getAttribute('data-large-title'), '');
    assert.match(heading.textContent ?? '', /Members\s*12/);

    const standIn = screen
      .getByTestId('list-page-header')
      .querySelector('[data-page-header=title]');
    assert.equal(standIn?.getAttribute('aria-hidden'), 'true');
    assert.equal(screen.getByTestId('list-page').hasAttribute('data-large-title-host'), true);
    assert.equal(
      screen.getByTestId('list-page-header').hasAttribute('data-large-title-header'),
      true,
    );
  });

  it('keeps the usual header for a page without a title', () => {
    render(
      <PageChromeProvider value={{ largeTitles: true }}>
        <MembersPage withTitle={false} />
      </PageChromeProvider>,
    );

    assert.equal(screen.queryByRole('heading', { level: 1 }), null);
    assert.equal(screen.getByTestId('list-page').hasAttribute('data-large-title-host'), false);
    assert.equal(
      screen.getByTestId('list-page-header').hasAttribute('data-large-title-header'),
      false,
    );
  });
});
