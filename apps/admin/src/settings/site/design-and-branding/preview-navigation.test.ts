import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { followPreviewLinks } from './preview-navigation';

const PAGE_URL = 'https://site.test/about/';

describe('followPreviewLinks', () => {
  let frame: HTMLIFrameElement;
  let doc: Document;
  let onNavigate: ReturnType<typeof vi.fn<(url: string) => void>>;
  // Whether the preview cancelled the last click, read before the test cancels it
  // itself, so jsdom doesn't try to follow the link
  let clickPrevented: boolean | undefined;

  beforeEach(() => {
    frame = document.createElement('iframe');
    document.body.append(frame);
    doc = frame.contentDocument!;
    doc.body.innerHTML = `
      <a id="same" href="/posts/hello/#comments">Same site</a>
      <a id="other" href="https://elsewhere.test/">Elsewhere</a>
      <a id="spot" href="#intro">Intro</a>
      <a id="portal" href="#/portal/signup">Sign up</a>
      <a id="new-tab" href="/posts/hello/" target="_blank">New tab</a>
      <section id="intro"></section>
      <form id="form"><button>Subscribe</button></form>
    `;
    onNavigate = vi.fn<(url: string) => void>();
    followPreviewLinks(doc, PAGE_URL, onNavigate);
    clickPrevented = undefined;
    doc.addEventListener('click', (event) => {
      clickPrevented = event.defaultPrevented;
      event.preventDefault();
    });
  });

  afterEach(() => {
    frame.remove();
    vi.restoreAllMocks();
  });

  function click(id: string, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
    doc.getElementById(id)!.dispatchEvent(event);
    return event;
  }

  it("asks for a page of the site's own, without its hash", () => {
    click('same');

    expect(clickPrevented).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith('https://site.test/posts/hello/');
  });

  it('opens a link elsewhere in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    click('other');

    expect(clickPrevented).toBe(true);
    expect(open).toHaveBeenCalledWith('https://elsewhere.test/', '_blank', 'noopener');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('scrolls to a spot on the page', () => {
    const scrollIntoView = vi.fn();
    doc.getElementById('intro')!.scrollIntoView = scrollIntoView;

    click('spot');

    expect(clickPrevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('keeps Portal inert', () => {
    const event = click('portal');

    // Nothing else on the page hears it, so Portal doesn't open
    expect(event.defaultPrevented).toBe(true);
    expect(clickPrevented).toBeUndefined();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('leaves modified clicks and links to a new tab their own way', () => {
    click('same', { metaKey: true });
    expect(clickPrevented).toBe(false);

    click('new-tab');
    expect(clickPrevented).toBe(false);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('keeps forms from submitting', () => {
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    doc.getElementById('form')!.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
  });
});
