import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { currentRoute, watchHistory, type HistoryWatch } from '../src/history.ts';

let watch: HistoryWatch | undefined;
const moved = vi.fn(async () => {});
const load = vi.fn();

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  document.body.innerHTML = '';
  watch = watchHistory(moved, load);
});

afterEach(() => {
  watch?.stop();
  vi.clearAllMocks();
});

/** Adds a link to the page and clicks it, returning whether the click's default went ahead. */
function click(attributes: Record<string, string>, init: MouseEventInit = {}) {
  const link = document.createElement('a');
  for (const [name, value] of Object.entries(attributes)) {
    link.setAttribute(name, value);
  }
  const label = document.createElement('span');
  link.append(label);
  document.body.append(link);
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  return label.dispatchEvent(event);
}

describe('the page’s history, once Admin owns it', () => {
  it('replaces the frame’s entry for each pushState and replaceState, reporting each as such', () => {
    const entries = window.history.length;

    window.history.pushState({ n: 1 }, '', '/episodes/12');
    window.history.replaceState({ n: 2 }, '', '/episodes/13?sort=new#top');

    expect(moved.mock.calls).toEqual([
      ['/episodes/12', 'push'],
      ['/episodes/13?sort=new#top', 'replace'],
    ]);
    expect(window.history.length).toBe(entries);
    expect(currentRoute()).toBe('/episodes/13?sort=new#top');
    expect(window.history.state).toEqual({ n: 2 });
  });

  it('reports nothing for a move to the route the page is already on', () => {
    window.history.replaceState({ scroll: 10 }, '');
    window.history.pushState({ scroll: 20 }, '', '/');

    expect(moved).not.toHaveBeenCalled();
    expect(window.history.state).toEqual({ scroll: 20 });
  });

  it('reports a route in the normalised form Admin stores', () => {
    window.history.pushState(null, '', '/x/../search?q=a b');

    expect(moved).toHaveBeenCalledWith('/search?q=a%20b', 'push');
  });

  it('refuses a pushState or replaceState to a route Admin would not open', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.history.pushState({ n: 1 }, '', '/a');
    window.history.pushState({ n: 2 }, '', '/.//x/');
    window.history.replaceState({ n: 3 }, '', '/.//x/');
    window.history.replaceState({ n: 4 }, '', '/a');

    expect(moved.mock.calls).toEqual([['/a', 'push']]);
    expect(currentRoute()).toBe('/a');
    expect(window.history.state).toEqual({ n: 4 });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('//x/'));
    warn.mockRestore();
  });

  it('preserves state set on the initial route before the SDK takes over history', () => {
    watch?.stop();
    const initialState = { restoreScroll: 450, draft: 'editor-7' };
    window.history.replaceState(initialState, '', '/start');
    watch = watchHistory(moved, load);
    window.history.pushState({ route: 'next' }, '', '/next');
    const popped = vi.fn();
    window.addEventListener('popstate', popped);

    watch.follow('/start');

    window.removeEventListener('popstate', popped);
    expect(currentRoute()).toBe('/start');
    expect(window.history.state).toEqual(initialState);
    expect((popped.mock.calls[0]?.[0] as PopStateEvent).state).toEqual(initialState);
  });

  it('follows Admin: replaces the entry with the state the app gave that route, then dispatches popstate', () => {
    window.history.pushState({ n: 1 }, '', '/a');
    window.history.pushState({ n: 2 }, '', '/b');
    const popped = vi.fn();
    window.addEventListener('popstate', popped);

    watch?.follow('/a');

    window.removeEventListener('popstate', popped);
    expect(currentRoute()).toBe('/a');
    expect(window.history.state).toEqual({ n: 1 });
    expect(popped).toHaveBeenCalledOnce();
    expect((popped.mock.calls[0]?.[0] as PopStateEvent).state).toEqual({ n: 1 });
    // Admin made the move, so it isn't reported back.
    expect(moved).toHaveBeenCalledTimes(2);

    watch?.follow('/elsewhere');
    expect(window.history.state).toBeNull();
  });

  it('reports a click on a link to its own origin as a push, then loads it in place', async () => {
    let answer = () => {};
    moved.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          answer = resolve;
        }),
    );

    expect(click({ href: '/episodes/12' })).toBe(false);

    expect(moved).toHaveBeenCalledWith('/episodes/12', 'push');
    // The page stays until Admin has recorded the move.
    expect(load).not.toHaveBeenCalled();
    answer();
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith('http://localhost:3000/episodes/12'));
  });

  it('finds a link inside a shadow root, and an SVG link', async () => {
    const SVG = 'http://www.w3.org/2000/svg';
    const host = document.createElement('div');
    const shadowLink = document.createElement('a');
    shadowLink.setAttribute('href', '/episodes/12');
    shadowLink.append(document.createElement('span'));
    host.attachShadow({ mode: 'open' }).append(shadowLink);
    const svg = document.createElementNS(SVG, 'svg');
    const svgLink = document.createElementNS(SVG, 'a');
    svgLink.setAttribute('href', '/episodes/13');
    svgLink.append(document.createElementNS(SVG, 'text'));
    svg.append(svgLink);
    document.body.append(host, svg);

    for (const link of [shadowLink, svgLink]) {
      const label = link.firstElementChild as Element;
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
      });
      expect(label.dispatchEvent(event)).toBe(false);
    }

    expect(moved.mock.calls).toEqual([
      ['/episodes/12', 'push'],
      ['/episodes/13', 'push'],
    ]);
    await vi.waitFor(() =>
      expect(load.mock.calls).toEqual([
        ['http://localhost:3000/episodes/12'],
        ['http://localhost:3000/episodes/13'],
      ]),
    );
  });

  it('loads the link even when Admin refuses the move', async () => {
    moved.mockRejectedValueOnce(new Error('session_ended'));

    click({ href: '/episodes/12' });

    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
  });

  it('neither loads nor reports a link to a route Admin would not open', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(click({ href: '/.//x/' })).toBe(false);

    expect(moved).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(currentRoute()).toBe('/');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('//x/'));
    warn.mockRestore();
  });

  it('loads a link to the route the page is on without reporting it', () => {
    click({ href: '/' });

    expect(moved).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledWith('http://localhost:3000/');
  });

  it('leaves alone a link that opens elsewhere, or that the app handled itself', () => {
    const handled = (event: Event) => event.preventDefault();
    for (const [attributes, init] of [
      [{ href: 'https://elsewhere.example/' }, {}],
      // An object URL the page made is on its origin, but isn't one of its routes.
      [{ href: `blob:${window.location.origin}/0c4e` }, {}],
      [{ href: '/x', target: '_blank' }, {}],
      [{ href: '/x', target: 'other' }, {}],
      [{ href: '/x', download: '' }, {}],
      [{ href: '/x' }, { metaKey: true }],
      [{ href: '/x' }, { ctrlKey: true }],
      [{ href: '/x' }, { shiftKey: true }],
      [{ href: '/x' }, { altKey: true }],
      [{ href: '/x' }, { button: 1 }],
      [{}, {}],
    ] as const) {
      click(attributes, init);
    }
    document.addEventListener('click', handled, { capture: true });
    click({ href: '/x' });
    document.removeEventListener('click', handled, { capture: true });

    expect(moved).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it('follows a link in the app’s overlay from the page, a web page elsewhere too', async () => {
    const overlayDocument = () => {
      const frame = document.createElement('iframe');
      document.body.append(frame);
      onTestFinished(() => frame.remove());
      const OverlayMouseEvent = (frame.contentWindow as unknown as typeof globalThis).MouseEvent;
      const overlay = frame.contentDocument as Document;
      const clickLink = (href: string) => {
        const link = overlay.createElement('a');
        link.setAttribute('href', href);
        overlay.body.append(link);
        return link.dispatchEvent(
          new OverlayMouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
        );
      };
      return { overlay, click: clickLink };
    };
    const first = overlayDocument();
    watch?.watchLinks(first.overlay);
    watch?.watchLinks(first.overlay);
    window.history.replaceState(null, '', '/episodes/');
    moved.mockClear();

    // Relative to the page's route, not to the overlay's own address.
    expect(first.click('next')).toBe(false);
    expect(moved).toHaveBeenCalledExactlyOnceWith('/episodes/next', 'push');
    await vi.waitFor(() =>
      expect(load).toHaveBeenCalledExactlyOnceWith('http://localhost:3000/episodes/next'),
    );

    expect(first.click('https://example.com/')).toBe(false);
    expect(load).toHaveBeenLastCalledWith('https://example.com/');
    expect(first.click('mailto:support@example.com')).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(moved).toHaveBeenCalledOnce();

    // Admin loaded the overlay again: its previous document is done with.
    const second = overlayDocument();
    watch?.watchLinks(second.overlay);
    expect(first.click('https://example.com/')).toBe(true);
    expect(second.click('https://example.com/')).toBe(false);
    expect(load).toHaveBeenCalledTimes(3);

    watch?.stop();
    watch?.watchLinks(first.overlay);
    watch = undefined;
    expect(first.click('/after')).toBe(true);
    expect(second.click('/after')).toBe(true);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('gives the page its own history and links back when stopped', () => {
    watch?.stop();
    watch = undefined;

    window.history.pushState(null, '', '/after');
    click({ href: '/x' });

    expect(moved).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(window.history.pushState).toBe(History.prototype.pushState);
  });
});
