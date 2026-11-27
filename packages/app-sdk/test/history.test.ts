import { setImmediate } from 'node:timers/promises';

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

  describe.each([
    'Admin',
    'Admin returning to the link route',
    'pushState',
    'replaceState',
    'pushState to the link route',
    'replaceState to the link route',
    'another link',
    'stop',
    'nothing',
  ] as const)('a link completed after %s', (schedule) => {
    it.each(['accepted', 'refused'] as const)(
      'loads only the current link when its report is %s',
      async (answer) => {
        let accept!: () => void;
        let refuse!: (error: Error) => void;
        const pending = new Promise<void>((resolve, reject) => {
          accept = resolve;
          refuse = reject;
        });
        moved.mockReturnValueOnce(pending);
        click({ href: '/a' });
        expect(load).not.toHaveBeenCalled();

        if (schedule === 'Admin' || schedule === 'Admin returning to the link route') {
          watch?.follow('/c#top');
          if (schedule === 'Admin returning to the link route') {
            watch?.follow('/a');
          }
        } else if (schedule === 'pushState' || schedule === 'replaceState') {
          window.history[schedule](null, '', '/b');
          window.history[schedule](null, '', '/a');
        } else if (schedule === 'pushState to the link route') {
          window.history.pushState(null, '', '/a');
        } else if (schedule === 'replaceState to the link route') {
          window.history.replaceState(null, '', '/a');
        } else if (schedule === 'another link') {
          click({ href: '/b' });
          click({ href: '/a' });
          // Observe the newer load while the old report is still held.
          await vi.waitFor(() => expect(load.mock.calls).toEqual([['http://localhost:3000/a']]));
        } else if (schedule === 'stop') {
          watch?.stop();
        }

        if (answer === 'accepted') {
          accept();
        } else {
          refuse(new Error('The move was refused'));
        }
        // Cross an event-loop turn after settlement before checking for an obsolete load.
        await pending.catch(() => {});
        await setImmediate();

        expect(load.mock.calls).toEqual(
          schedule === 'nothing' || schedule === 'another link'
            ? [['http://localhost:3000/a']]
            : [],
        );
      },
    );
  });

  it.each(['accepted', 'refused'] as const)(
    'does not load an older %s link while the newest report is still pending',
    async (answer) => {
      let acceptOld!: () => void;
      let refuseOld!: (error: Error) => void;
      let acceptMiddle!: () => void;
      let acceptLatest!: () => void;
      const old = new Promise<void>((resolve, reject) => {
        acceptOld = resolve;
        refuseOld = reject;
      });
      const middle = new Promise<void>((resolve) => {
        acceptMiddle = resolve;
      });
      const latest = new Promise<void>((resolve) => {
        acceptLatest = resolve;
      });
      moved.mockReturnValueOnce(old).mockReturnValueOnce(middle).mockReturnValueOnce(latest);

      click({ href: '/a' });
      click({ href: '/b' });
      click({ href: '/a' });
      await Promise.resolve();
      expect(load).not.toHaveBeenCalled();

      if (answer === 'accepted') {
        acceptOld();
      } else {
        refuseOld(new Error('The move was refused'));
      }
      await old.catch(() => {});
      await setImmediate();
      expect(load).not.toHaveBeenCalled();

      acceptLatest();
      await latest;
      await vi.waitFor(() => expect(load.mock.calls).toEqual([['http://localhost:3000/a']]));

      acceptMiddle();
      await middle;
      await setImmediate();
      expect(load.mock.calls).toEqual([['http://localhost:3000/a']]);
    },
  );

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
      await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(moved.mock.calls.length));
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
