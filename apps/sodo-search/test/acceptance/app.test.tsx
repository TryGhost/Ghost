import App from '../../src/app';
import styles from '../../src/index.css?inline';
import { render } from 'preact';
import { userEvent } from 'vitest/browser';

const FIXTURES: Record<string, object[]> = {
  posts: [
    {
      id: 'post-apple',
      title: 'Apple pie',
      excerpt: 'Bake it slowly',
      url: 'https://site.test/apple-pie/',
    },
    {
      id: 'post-apricot',
      title: 'Apricot jam',
      excerpt: 'Spread it thin',
      url: 'https://site.test/apricot-jam/',
    },
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `post-smoke-${i + 1}`,
      title: `Smoke signal ${i + 1}`,
      excerpt: 'Read the sky',
      url: `https://site.test/smoke-${i + 1}/`,
    })),
  ],
  authors: [
    {
      id: 'author-ada',
      name: 'Ada Lovelace',
      url: 'https://site.test/author/ada/',
      profile_image: null,
    },
  ],
  tags: [
    { id: 'tag-apple', name: 'Apple', url: 'https://site.test/tag/apple/' },
    { id: 'tag-apricot', name: 'Apricot', url: 'https://site.test/tag/apricot/' },
  ],
};

let container: HTMLElement;
let stylesUrl: string;
let originalHref: string;

function mountApp(locale?: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  render(
    <App adminUrl="https://site.test" apiKey="test-key" locale={locale} stylesUrl={stylesUrl} />,
    container,
  );
}

function popupDocument() {
  return (
    document.querySelector<HTMLIFrameElement>('.gh-root-frame iframe')?.contentDocument ?? null
  );
}

async function openedPopup() {
  return vi.waitFor(() => {
    const doc = popupDocument();
    const input = doc?.querySelector('input');
    if (!doc || !input || doc.activeElement !== input) {
      throw new Error('Search popup is not open and focused');
    }
    return doc;
  });
}

// Opening schedules its own input focus; tests that move focus wait for it to settle first
function settleOpeningFocus() {
  return new Promise((resolve) => {
    setTimeout(resolve, 300);
  });
}

async function openFromTrigger() {
  await userEvent.click(document.querySelector('[data-ghost-search]')!);
  return openedPopup();
}

function selectedResult(doc: Document) {
  return doc.querySelector('[role=option][aria-selected=true]')?.textContent ?? null;
}

function sections(doc: Document) {
  return Object.fromEntries(
    [...doc.querySelectorAll('[role=group]')].map((group) => [
      doc.getElementById(group.getAttribute('aria-labelledby')!)!.textContent,
      [...group.querySelectorAll('[role=option]')].map((option) => option.textContent),
    ]),
  );
}

beforeEach(() => {
  originalHref = window.location.href;
  stylesUrl = URL.createObjectURL(new Blob([styles], { type: 'text/css' }));
  const originalFetch = window.fetch.bind(window);
  vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const resource = String(input).match(
      /\/ghost\/api\/content\/search-index\/(\w+)\/\?key=test-key$/,
    )?.[1];
    if (!resource) {
      return originalFetch(input, init);
    }
    return Response.json({ [resource]: FIXTURES[resource] });
  });
  document.body.insertAdjacentHTML('beforeend', '<button data-ghost-search>Search</button>');
});

afterEach(() => {
  render(null, container);
  container.remove();
  document.querySelector('[data-ghost-search]')?.remove();
  URL.revokeObjectURL(stylesUrl);
  window.history.replaceState(null, '', originalHref);
  vi.restoreAllMocks();
});

test('opens from a [data-ghost-search] trigger with the input focused and page scroll locked', async () => {
  mountApp();
  expect(popupDocument()).toBeNull();

  const doc = await openFromTrigger();

  expect(document.body.style.overflow).toBe('hidden');
  expect(document.querySelector('.gh-root-frame iframe')!.getAttribute('title')).toBe(
    'Search posts, tags and authors',
  );
  expect(doc.documentElement.getAttribute('dir')).toBe('ltr');
  expect(doc.querySelector('input')!.placeholder).toBe('Search posts, tags and authors');
});

test('lists authors, tags and posts, paginating posts with Show more', async () => {
  mountApp();
  const doc = await openFromTrigger();

  await userEvent.keyboard('a');
  await vi.waitFor(() => expect(Object.keys(sections(doc))).toEqual(['Authors', 'Tags', 'Posts']));
  expect(sections(doc).Authors).toEqual(['AAda Lovelace']);

  await userEvent.keyboard('{Backspace}smoke');
  await vi.waitFor(() => expect(sections(doc).Posts).toHaveLength(11));
  doc.querySelector<HTMLButtonElement>('button.w-full')!.click();
  await vi.waitFor(() => expect(sections(doc).Posts).toHaveLength(15));
  expect(doc.querySelector('button.w-full')).toBeNull();
});

test('moves the selection once per arrow key, even when keys arrive within one frame', async () => {
  mountApp();
  const doc = await openFromTrigger();

  await userEvent.keyboard('ap');
  await vi.waitFor(() => expect(selectedResult(doc)).toBe('#Apple'));

  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  await vi.waitFor(() => expect(selectedResult(doc)).toContain('Apple pie'));

  await userEvent.keyboard('{ArrowUp}');
  await vi.waitFor(() => expect(selectedResult(doc)).toBe('#Apricot'));
});

test('starts each new query from its first result, even when the next key arrives within one frame', async () => {
  mountApp();
  const doc = await openFromTrigger();

  await userEvent.keyboard('ap{ArrowDown}{ArrowDown}');
  await vi.waitFor(() => expect(selectedResult(doc)).toContain('Apple pie'));

  // "apr" drops Apple pie; the reset to the new first result must land before ArrowDown
  await userEvent.keyboard('r{ArrowDown}');
  await vi.waitFor(() => expect(selectedResult(doc)).toContain('Apricot jam'));
});

test('starts from the first result when the same query is typed again', async () => {
  mountApp();
  const doc = await openFromTrigger();

  await userEvent.keyboard('smoke');
  await vi.waitFor(() => expect(selectedResult(doc)).toContain('Smoke signal 1'));
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  await vi.waitFor(() => expect(selectedResult(doc)).toContain('Smoke signal 3'));

  await userEvent.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}smoke');
  await vi.waitFor(() => expect(doc.querySelector('input')!.value).toBe('smoke'));
  expect(selectedResult(doc)).toContain('Smoke signal 1');
});

test('shows a no-results message and clears the query', async () => {
  mountApp();
  const doc = await openFromTrigger();

  await userEvent.keyboard('zzz');
  await vi.waitFor(() => expect(doc.body.textContent).toContain('No matches found'));

  doc.querySelector<HTMLButtonElement>('button.-mb-\\[1px\\]')!.click();
  await vi.waitFor(() => expect(doc.querySelector('input')!.value).toBe(''));
  expect(doc.body.textContent).not.toContain('No matches found');
});

test('closes on Escape, restoring page scroll and resetting the query', async () => {
  mountApp();
  let doc = await openFromTrigger();
  await userEvent.keyboard('apple');

  await userEvent.keyboard('{Escape}');
  await vi.waitFor(() => expect(popupDocument()).toBeNull());
  expect(document.body.style.overflow).toBe('');

  doc = await openFromTrigger();
  expect(doc.querySelector('input')!.value).toBe('');
});

test('returns focus to the trigger that opened it', async () => {
  mountApp();
  const trigger = document.querySelector<HTMLElement>('[data-ghost-search]')!;
  await openFromTrigger();

  await userEvent.keyboard('{Escape}');
  await vi.waitFor(() => expect(popupDocument()).toBeNull());
  expect(document.activeElement).toBe(trigger);
});

test('keeps Tab focus inside the dialog', async () => {
  mountApp();
  const doc = await openFromTrigger();
  await settleOpeningFocus();
  await userEvent.keyboard('smoke');
  await vi.waitFor(() => expect(doc.querySelector('button.w-full')).not.toBeNull());
  const clearButton = doc.querySelector<HTMLElement>('button[aria-label="Clear search"]')!;
  const showMoreButton = doc.querySelector<HTMLElement>('button.w-full')!;

  showMoreButton.focus();
  await userEvent.keyboard('{Tab}');
  expect(doc.activeElement).toBe(clearButton);

  await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
  expect(doc.activeElement).toBe(showMoreButton);
});

test('leaves focus where the user moved it when the search index finishes loading', async () => {
  let releaseIndex!: () => void;
  const indexGate = new Promise<void>((resolve) => {
    releaseIndex = resolve;
  });
  const fetchMock = vi.mocked(window.fetch);
  const fakeApi = fetchMock.getMockImplementation()!;
  fetchMock.mockImplementation(async (input, init) => {
    await indexGate;
    return fakeApi(input, init);
  });
  mountApp();
  const doc = await openFromTrigger();
  await settleOpeningFocus();
  await userEvent.keyboard('x');
  const clearButton = await vi.waitFor(() => {
    const button = doc.querySelector<HTMLElement>('button[aria-label="Clear search"]');
    if (!button) {
      throw new Error('Clear button not rendered');
    }
    return button;
  });

  clearButton.focus();
  releaseIndex();
  await vi.waitFor(() => expect(doc.querySelector('svg.shrink-0')).toBeNull());
  await new Promise((resolve) => {
    setTimeout(resolve, 300);
  });
  expect(doc.activeElement).toBe(clearButton);
});

test('closes on a backdrop click', async () => {
  mountApp();
  const doc = await openFromTrigger();

  doc.querySelector<HTMLElement>('.ghost-display')!.click();
  await vi.waitFor(() => expect(popupDocument()).toBeNull());
});

test('opens from the #/search hash and removes it from the URL', async () => {
  window.history.replaceState(null, '', '#/search');
  mountApp();

  await openedPopup();
  expect(window.location.hash).toBe('');
});

test('opens on Cmd+K when the page has a search trigger', async () => {
  mountApp();

  await userEvent.keyboard('{Meta>}k{/Meta}');
  await openedPopup();
});

test('ignores the shortcut until the page has a search trigger', async () => {
  document.querySelector('[data-ghost-search]')!.remove();
  mountApp();

  await userEvent.keyboard('{Meta>}k{/Meta}');
  await new Promise(requestAnimationFrame);
  expect(popupDocument()).toBeNull();

  document.body.insertAdjacentHTML('beforeend', '<button data-ghost-search>Search</button>');
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await openedPopup();
});

test('opens from a trigger added after mount, even inside an element that stops click propagation', async () => {
  mountApp();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = '<a href="#/elsewhere" data-ghost-search><span>Find</span></a>';
  wrapper.addEventListener('click', (e) => e.stopPropagation());
  document.body.appendChild(wrapper);

  await userEvent.click(wrapper.querySelector('span')!);
  await openedPopup();
  expect(window.location.hash).toBe('');

  wrapper.remove();
});

test('renders right-to-left with translations for an RTL locale', async () => {
  mountApp('ar');
  const doc = await openFromTrigger();

  expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
  expect(doc.querySelector('input')!.placeholder).toBe('قم بالبحث عن المنشورات، الوسوم و الكتّاب');
});
