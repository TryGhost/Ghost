import styles from '../../../../ghost/core/frontend/src/announcement-bar/announcement-bar.css?raw';
import script from '../../../../ghost/core/frontend/src/announcement-bar/announcement-bar.js?raw';

type Frame = { barHeight: number; headerTop: number };

const iframe = document.createElement('iframe');
const content = 'A longer announcement that wraps on a narrow screen. Read the full story here.';

function loadTheme(
  position: string,
  announcement = content,
  header = '<header>Navigation</header>',
) {
  const loaded = new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
  });
  iframe.srcdoc = `<!doctype html><html><head>
    <style>${styles}body {margin: 0; height: 200vh} body > :nth-child(2) {position:${position}; inset:0 0 auto; height:40px}</style>
    <script data-announcement="${announcement}">${script}</script>
    </head><body><div id="announcement-bar-root"><div class="gh-announcement-bar dark">
    <div class="gh-announcement-bar-content">${announcement}</div><button>Close</button></div></div>
    ${header}<main>Page content</main><script>
    window.framesMeasured = [];
    function measure() {
      window.framesMeasured.push({
        barHeight: document.querySelector('.gh-announcement-bar').getBoundingClientRect().height,
        headerTop: document.querySelector('body > :nth-child(2)').getBoundingClientRect().top
      });
      if (window.framesMeasured.length < 3) requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
    </script></body></html>`;
  return loaded;
}

async function measuredFrames() {
  const win = iframe.contentWindow as Window & { framesMeasured: Frame[] };
  await vi.waitFor(() => expect(win.framesMeasured).toHaveLength(3));
  return win.framesMeasured;
}

beforeEach(() => {
  sessionStorage.clear();
  iframe.width = '300';
  document.body.append(iframe);
});
afterEach(() => iframe.remove());

test.each(['static', 'fixed', 'absolute', 'sticky'])(
  '%s header clears the bar from first paint and after dismissal',
  async (position) => {
    await loadTheme(position);
    for (const { barHeight, headerTop } of await measuredFrames()) {
      expect(barHeight).toBeGreaterThan(48);
      expect(headerTop).toBe(barHeight);
    }

    iframe.contentDocument!.querySelector('button')!.click();
    await loadTheme(position);
    for (const frame of await measuredFrames()) {
      expect(frame).toEqual({ barHeight: 0, headerTop: 0 });
    }

    await loadTheme(position, 'Updated news');
    for (const frame of await measuredFrames()) {
      expect(frame).toEqual({ barHeight: 48, headerTop: 48 });
    }
  },
);

test('recognizes a fixed masthead made from a div and a home link', async () => {
  await loadTheme('fixed', content, '<div><a href="/">Home</a></div>');
  for (const { barHeight, headerTop } of await measuredFrames()) {
    expect(headerTop).toBe(barHeight);
  }
});

test('keeps a fixed header attached while the bar wraps, scrolls away and is dismissed', async () => {
  await loadTheme('fixed');
  await measuredFrames();
  const win = iframe.contentWindow!;
  const header = win.document.querySelector('header')!;
  const bar = win.document.querySelector('.gh-announcement-bar')!;
  iframe.width = '900';
  try {
    await vi.waitFor(() => {
      expect(bar.getBoundingClientRect().height).toBe(48);
      expect(header.getBoundingClientRect().top).toBe(48);
    });
    win.scrollTo(0, 20);
    await vi.waitFor(() => expect(header.getBoundingClientRect().top).toBe(28));
    win.scrollTo(0, 100);
    await vi.waitFor(() => expect(header.getBoundingClientRect().top).toBe(0));
    win.scrollTo(0, 0);
    await vi.waitFor(() => expect(header.getBoundingClientRect().top).toBe(48));
    win.document.querySelector('button')!.click();
    expect(header.getBoundingClientRect().top).toBe(0);
  } finally {
    iframe.width = '300';
  }
});
