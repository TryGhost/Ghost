import { App } from '../../src/app';
import { render } from 'preact';
import { userEvent } from 'vitest/browser';
import type { AnnouncementSettings } from '../../src/utils/api';

const API_URL = 'https://site.test/members/api/announcement/';

let container: HTMLElement;
let announcement: AnnouncementSettings;

function mountApp(props: { previewData?: AnnouncementSettings } = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  render(<App apiUrl={API_URL} {...props} />, container);
}

function unmountApp() {
  render(null, container);
  container.remove();
}

function remountApp() {
  unmountApp();
  mountApp();
}

function bar() {
  return container.querySelector<HTMLElement>('.gh-announcement-bar');
}

async function shownBar() {
  return vi.waitFor(() => {
    const el = bar();
    if (!el) {
      throw new Error('Announcement bar is not shown');
    }
    return el;
  });
}

function apiCalls() {
  return vi.mocked(window.fetch).mock.calls.filter(([input]) => String(input) === API_URL);
}

// Preact runs effects after the next frame; two passes cover the bar's effect and its re-render
async function effectsFlushed() {
  for (let pass = 0; pass < 2; pass++) {
    await new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve));
    });
  }
}

beforeEach(() => {
  sessionStorage.clear();
  announcement = {
    announcement: '<p>Big news! <a href="https://site.test/news/">Read more</a></p>',
    announcement_background: 'dark',
  };
  const originalFetch = window.fetch.bind(window);
  vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
    if (String(input) === API_URL) {
      const body = { announcement: [announcement] };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
    }
    return originalFetch(input, init);
  });
});

afterEach(() => {
  unmountApp();
  vi.restoreAllMocks();
});

describe('Announcement bar', () => {
  test('renders the announcement fetched from the API', async () => {
    mountApp();

    const el = await shownBar();

    expect(window.fetch).toHaveBeenCalledWith(API_URL, expect.objectContaining({ method: 'GET' }));
    expect(el.className).toBe('gh-announcement-bar dark');
    expect(el.querySelector('.gh-announcement-bar-content')!.innerHTML).toBe(
      announcement.announcement,
    );
    expect(getComputedStyle(el).backgroundColor).toBe('rgb(21, 23, 26)');

    const path = el.querySelector('button svg path')!;
    expect(path.getAttribute('stroke-linecap')).toBe('round');
    expect(path.getAttribute('stroke-width')).toBe('0.4');

    const link = el.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://site.test/news/');
    const box = link.getBoundingClientRect();
    expect(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)).toBe(link);
  });

  test('renders nothing when there is no announcement', async () => {
    announcement = { announcement: '', announcement_background: 'dark' };
    mountApp();

    await vi.waitFor(() => expect(apiCalls()).toHaveLength(1));
    await effectsFlushed();

    expect(container.innerHTML).toBe('');
  });

  test('stays dismissed after a reload', async () => {
    mountApp();

    await userEvent.click((await shownBar()).querySelector('button')!);

    expect(bar()).toBeNull();
    expect(sessionStorage.getItem('isAnnouncementBarVisible')).toBeNull();
    expect(sessionStorage.getItem('announcementBarContent')).toBe(announcement.announcement);

    remountApp();
    await vi.waitFor(() => expect(apiCalls()).toHaveLength(2));
    await effectsFlushed();

    expect(bar()).toBeNull();
  });

  test('stays visible after a reload when not dismissed', async () => {
    mountApp();
    await shownBar();

    expect(sessionStorage.getItem('isAnnouncementBarVisible')).toBe('true');

    remountApp();

    await shownBar();
  });

  test('shows again after a dismissal when the announcement changes', async () => {
    mountApp();
    await userEvent.click((await shownBar()).querySelector('button')!);

    announcement = { ...announcement, announcement: '<p>Even bigger news</p>' };
    remountApp();

    const el = await shownBar();
    expect(el.textContent).toBe('Even bigger news');
  });

  test('renders preview data without fetching', async () => {
    mountApp({
      previewData: { announcement: '<p>Preview text</p>', announcement_background: 'light' },
    });

    const el = await shownBar();

    expect(el.className).toBe('gh-announcement-bar light');
    expect(el.textContent).toBe('Preview text');
    expect(getComputedStyle(el).backgroundColor).toBe('rgb(240, 240, 240)');
    expect(apiCalls()).toHaveLength(0);
  });
});
