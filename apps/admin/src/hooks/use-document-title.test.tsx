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

  it('shows Admin’s title with the site title', () => {
    renderHook(() => useDocumentTitle());

    expect(document.title).toBe('Ghost Admin - Example');
  });

  it('shows a page’s title while the page is mounted, and Admin’s after it unmounts', () => {
    const admin = renderHook(() => useDocumentTitle());
    const page = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Episodes · Podcast' },
    });
    expect(document.title).toBe('Episodes · Podcast');

    // A change to the site title in the meantime doesn't replace the page's title.
    mockSiteTitle('Renamed');
    admin.rerender();
    expect(document.title).toBe('Episodes · Podcast');

    page.unmount();
    expect(document.title).toBe('Ghost Admin - Renamed');
  });

  it('shows Admin’s title when a page has not set a title', () => {
    renderHook(() => useDocumentTitle());
    renderHook(() => usePageTitle(undefined));

    expect(document.title).toBe('Ghost Admin - Example');
  });
});
