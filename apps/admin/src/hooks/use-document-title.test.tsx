import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle, usePageTitle } from './use-document-title';

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
  useBrowseSite: vi.fn(),
}));

const { useBrowseSite } = vi.mocked(await import('@tryghost/admin-x-framework/api/site'));

function mockSiteTitle(title: string) {
  useBrowseSite.mockReturnValue({
    data: { site: { title } },
  } as unknown as ReturnType<typeof useBrowseSite>);
}

describe('useDocumentTitle', () => {
  beforeEach(() => {
    mockSiteTitle('Example');
    document.title = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows Admin’s title with the site’s', () => {
    renderHook(() => useDocumentTitle());

    expect(document.title).toBe('Ghost Admin - Example');
  });

  it('shows a page’s own title while it is mounted, and Admin’s once it unmounts', () => {
    const admin = renderHook(() => useDocumentTitle());
    const page = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Episodes · Podcast' },
    });
    expect(document.title).toBe('Episodes · Podcast');

    // The site's title changing meanwhile leaves the page's in place.
    mockSiteTitle('Renamed');
    admin.rerender();
    expect(document.title).toBe('Episodes · Podcast');

    page.unmount();
    expect(document.title).toBe('Ghost Admin - Renamed');
  });

  it('shows Admin’s title while a page has given none', () => {
    renderHook(() => useDocumentTitle());
    renderHook(() => usePageTitle(undefined));

    expect(document.title).toBe('Ghost Admin - Example');
  });
});
