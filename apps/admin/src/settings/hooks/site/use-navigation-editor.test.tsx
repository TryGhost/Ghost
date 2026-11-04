import useNavigationEditor, {
  type NavigationItem,
} from '@/settings/hooks/site/use-navigation-editor';
import { act, renderHook, waitFor } from '@testing-library/react';

describe('useNavigationEditor', function () {
  it('defaults optional icon and visibility fields for editing', function () {
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [{ label: 'Home', url: '/' }],
        setItems: vi.fn(),
      }),
    );

    expect(result.current.items[0].icon).toBe('');
    expect(result.current.items[0].visibility).toBe('public');
  });

  it('serializes icon and non-public visibility when an item changes', async function () {
    const setItems = vi.fn();
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [{ label: 'Home', url: '/' }],
        setItems,
      }),
    );

    act(() => {
      result.current.updateItem('0', {
        icon: ' https://example.com/nav.svg ',
        visibility: 'members',
      });
    });

    await waitFor(() => {
      expect(setItems.mock.calls.at(-1)?.[0]).toStrictEqual([
        {
          url: '/',
          label: 'Home',
          icon: 'https://example.com/nav.svg',
          visibility: 'members',
        },
      ]);
    });
  });

  it('serializes granular visibility combinations', async function () {
    const setItems = vi.fn();
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [{ label: 'Home', url: '/' }],
        setItems,
      }),
    );

    act(() => {
      result.current.updateItem('0', {
        visibility: 'public_free',
      });
    });

    await waitFor(() => {
      expect(setItems.mock.calls.at(-1)?.[0]).toStrictEqual([
        {
          url: '/',
          label: 'Home',
          visibility: 'public_free',
        },
      ]);
    });
  });

  it('serializes hidden visibility', async function () {
    const setItems = vi.fn();
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [{ label: 'Home', url: '/' }],
        setItems,
      }),
    );

    act(() => {
      result.current.updateItem('0', {
        visibility: 'none',
      });
    });

    await waitFor(() => {
      expect(setItems.mock.calls.at(-1)?.[0]).toStrictEqual([
        {
          url: '/',
          label: 'Home',
          visibility: 'none',
        },
      ]);
    });
  });

  it('omits empty icon and public visibility when serializing new items', async function () {
    const setItems = vi.fn();
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [],
        setItems,
      }),
    );

    act(() => {
      result.current.setNewItem({
        label: ' Blog ',
        url: '/blog/',
        icon: '',
        visibility: 'public',
      });
    });

    act(() => {
      result.current.addItem();
    });

    await waitFor(() => {
      expect(setItems.mock.calls.at(-1)?.[0]).toStrictEqual([
        {
          url: '/blog/',
          label: 'Blog',
        },
      ]);
    });
  });

  it('allows adding an icon-only item', async function () {
    const setItems = vi.fn();
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [],
        setItems,
      }),
    );

    act(() => {
      result.current.setNewItem({
        label: '',
        url: '/icon-only/',
        icon: 'https://example.com/nav.svg',
      });
    });

    act(() => {
      result.current.addItem();
    });

    await waitFor(() => {
      expect(setItems.mock.calls.at(-1)?.[0]).toStrictEqual([
        {
          url: '/icon-only/',
          label: '',
          icon: 'https://example.com/nav.svg',
        },
      ]);
    });
  });

  it('requires either a label or an icon', async function () {
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [
          {
            label: '',
            url: '/missing-label-and-icon/',
          },
        ],
        setItems: vi.fn(),
      }),
    );

    act(() => {
      expect(result.current.validate()).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.items[0].errors.label).toBe('You must specify a label or icon');
    });
  });

  it('validates visibility values', async function () {
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [
          {
            label: 'Members',
            url: '/members/',
            icon: 'mailto:test@example.com',
            visibility: 'invalid',
          } as unknown as NavigationItem,
        ],
        setItems: vi.fn(),
      }),
    );

    act(() => {
      expect(result.current.validate()).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.items[0].errors.visibility).toBe('You must specify a valid visibility');
    });
  });

  it('does not show user-facing validation errors for stored icon URLs', function () {
    const { result } = renderHook(() =>
      useNavigationEditor({
        items: [
          {
            label: 'FTP icon',
            url: '/ftp-icon/',
            icon: 'ftp://example.com/icon.svg',
          },
        ],
        setItems: vi.fn(),
      }),
    );

    act(() => {
      expect(result.current.validate()).toBe(true);
    });
  });
});
