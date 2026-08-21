// Places the announcement bar that `{{ghost_head}}` rendered into the page.
//
// Unlike the other scripts here this one is inlined rather than linked, because
// it has to run before the first paint: an external script, deferred or not,
// executes once the document is parsed, by which point the article is painted
// and inserting the bar above it shifts the page.

type AnnouncementBarData = {
  /** Identity of the announcement, for session-scoped dismissal. */
  key: string;
  /** Absent when the audience has to be resolved by the members API. */
  announcement?: string;
  background?: string;
  apiUrl?: string;
};

type Announcement = {
  announcement: string;
  background: string;
};

const STORAGE_KEY = 'gh-announcement-dismissed';
const ROOT_ID = 'announcement-bar-root';
const BACKGROUNDS = ['accent', 'dark', 'light'];
const DEFAULT_BACKGROUND = 'dark';

const CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="16" width="16"><path stroke-linecap="round" stroke-width=".4" stroke="#000000" stroke-linejoin="round" d="M.44,21.44a1.49,1.49,0,0,0,0,2.12,1.5,1.5,0,0,0,2.12,0l9.26-9.26a.25.25,0,0,1,.36,0l9.26,9.26a1.5,1.5,0,0,0,2.12,0,1.49,1.49,0,0,0,0-2.12L14.3,12.18a.25.25,0,0,1,0-.36l9.26-9.26A1.5,1.5,0,0,0,21.44.44L12.18,9.7a.25.25,0,0,1-.36,0L2.56.44A1.5,1.5,0,0,0,.44,2.56L9.7,11.82a.25.25,0,0,1,0,.36Z" fill="currentColor"></path></svg>';

// The content element is left empty here and filled with innerHTML below, so the
// announcement is parsed inside its container. Concatenating it in would let a
// stray closing tag end the bar early and spill the rest into the page.
const SHELL =
  `<div id="${ROOT_ID}">` +
  '<div class="gh-announcement-bar">' +
  '<div class="gh-announcement-bar-content"></div>' +
  `<button aria-label="close">${CLOSE_ICON}</button>` +
  '</div>' +
  '</div>';

(function () {
  const dataElement = document.getElementById('gh-announcement-bar-data');

  if (!dataElement) {
    return;
  }

  const data = JSON.parse(dataElement.textContent || '{}') as AnnouncementBarData;

  // sessionStorage throws outright where site data is blocked, and a reader
  // with storage off should still see the bar. They just can't dismiss it.
  function dismissed(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === data.key;
    } catch {
      return false;
    }
  }

  function dismiss(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, data.key);
    } catch {
      // Nothing to do: the bar is closed either way.
    }
  }

  function background(value: unknown): string {
    return typeof value === 'string' && BACKGROUNDS.indexOf(value) !== -1
      ? value
      : DEFAULT_BACKGROUND;
  }

  function show(bar: Announcement): void {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    document.body.insertAdjacentHTML('afterbegin', SHELL);

    const root = document.body.firstElementChild as HTMLElement;
    (root.firstElementChild as HTMLElement).classList.add(bar.background);
    (root.querySelector('.gh-announcement-bar-content') as HTMLElement).innerHTML =
      bar.announcement;
    (root.querySelector('button') as HTMLElement).addEventListener('click', function () {
      root.remove();
      dismiss();
    });
  }

  // `{{ghost_head}}` runs while <body> is still a parser token away. A
  // MutationObserver callback is a microtask, and microtasks drain before the
  // next paint, so the bar makes it into the first frame's layout.
  function place(bar: Announcement): boolean {
    if (!document.body) {
      return false;
    }

    show(bar);

    return true;
  }

  function placeWhenBodyExists(bar: Announcement): void {
    if (place(bar)) {
      return;
    }

    new MutationObserver(function (mutations, observer) {
      if (place(bar)) {
        observer.disconnect();
      }
    }).observe(document.documentElement, { childList: true });
  }

  // The members API answers for this reader specifically. Its shape is checked
  // rather than trusted: it is a network boundary like any other.
  function fromApi(body: unknown): Announcement | null {
    const list = (body as { announcement?: unknown })?.announcement;
    const first = Array.isArray(list) ? list[0] : null;
    const announcement = (first as { announcement?: unknown })?.announcement;

    if (typeof announcement !== 'string' || announcement === '') {
      return null;
    }

    return {
      announcement,
      background: background(
        (first as { announcement_background?: unknown })?.announcement_background,
      ),
    };
  }

  if (dismissed()) {
    return;
  }

  // `apiUrl` is set only when ghost_head could not resolve the audience, because
  // the response is shared by every member on a tier. The announcement itself is
  // withheld until the API confirms this reader is in the audience.
  if (!data.apiUrl) {
    if (typeof data.announcement === 'string' && data.announcement !== '') {
      placeWhenBodyExists({
        announcement: data.announcement,
        background: background(data.background),
      });
    }

    return;
  }

  fetch(data.apiUrl)
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (body) {
      const bar = body === null ? null : fromApi(body);

      if (bar) {
        placeWhenBodyExists(bar);
      }
    })
    .catch(function () {
      // A failed audience check means no bar, which is the safe default.
    });
})();
