import { describe, expect, it } from 'vitest';
import { ARTICLE_ID_PREFIX, getHelpArticleSlug, prepareArticleHtml } from './help-article-html';

function render(html: string) {
  const container = document.createElement('div');
  container.innerHTML = prepareArticleHtml(html);
  return container;
}

// As Ghost renders them on the help center
const TOGGLE = `
  <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
    <div class="kg-toggle-heading">
      <h4 class="kg-toggle-heading-text"><span>Who can share gift links?</span></h4>
      <button class="kg-toggle-card-icon" aria-label="Expand toggle to read content">
        <svg viewBox="0 0 24 24"><path d="M23.25,7.311,12.53,18.03"></path></svg>
      </button>
    </div>
    <div class="kg-toggle-content"><p>Only staff users can share them.</p></div>
  </div>`;

const VIDEO = `
  <figure class="kg-card kg-video-card">
    <div class="kg-video-container">
      <video src="https://example.com/demo.mp4" muted playsinline preload="metadata"></video>
      <div class="kg-video-overlay">
        <button class="kg-video-large-play-icon"><svg viewBox="0 0 24 24"><path d="M1"></path></svg></button>
      </div>
      <div class="kg-video-player-container">
        <input type="range" class="kg-video-seek-slider">
      </div>
    </div>
  </figure>`;

describe('prepareArticleHtml', () => {
  it('turns toggle cards into native disclosures', () => {
    const details = render(TOGGLE).querySelector('details');
    expect(details?.querySelector('summary')?.textContent).toBe('Who can share gift links?');
    expect(details?.querySelector('p')?.textContent).toBe('Only staff users can share them.');
  });

  it('gives video cards the browser’s controls instead of Ghost’s player', () => {
    const container = render(VIDEO);
    expect(container.querySelector('video')?.hasAttribute('controls')).toBe(true);
    expect(container.querySelector('.kg-video-overlay, .kg-video-player-container')).toBeNull();
  });

  it('removes icons, buttons and inputs', () => {
    const container = render(TOGGLE + VIDEO);
    expect(container.querySelector('svg, button, input')).toBeNull();
  });

  it('removes scripts and iframes', () => {
    const container = render(
      '<p>Hi</p><script>alert(1)</script><iframe src="https://example.com"></iframe>',
    );
    expect(container.querySelector('script, iframe')).toBeNull();
    expect(container.textContent).toBe('Hi');
  });

  it('opens links outside Admin', () => {
    const link = render('<a href="https://ghost.org">Ghost</a>').querySelector('a');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps an article from restyling Admin: no inline styles, only Ghost’s card classes', () => {
    const container = render(
      '<div class="kg-card kg-callout-card fixed inset-0 z-50" style="position: fixed">Note</div>',
    );
    const card = container.querySelector('div');
    expect(card?.getAttribute('class')).toBe('kg-card kg-callout-card');
    expect(card?.hasAttribute('style')).toBe(false);
  });

  it('prefixes ids, and marks in-article anchors for the view to scroll to', () => {
    const container = render('<a href="#images">Images</a><h2 id="images">Images</h2>');
    expect(container.querySelector('h2')?.id).toBe(`${ARTICLE_ID_PREFIX}images`);
    const link = container.querySelector('a');
    expect(link?.getAttribute('data-help-anchor')).toBe(`${ARTICLE_ID_PREFIX}images`);
    expect(link?.hasAttribute('target')).toBe(false);
  });

  it('marks links to other help articles, to open in the panel', () => {
    const link = render('<a href="https://ghost.org/help/stripe/">Stripe</a>').querySelector('a');
    expect(link?.getAttribute('data-help-slug')).toBe('stripe');
  });

  it('removes javascript: links', () => {
    const link = render('<a href="javascript:alert(1)">Hi</a>').querySelector('a');
    expect(link?.getAttribute('href')).toBeNull();
  });

  it('keeps a video’s thumbnail as its poster', () => {
    const video = render(
      VIDEO.replace(
        'class="kg-card kg-video-card"',
        'class="kg-card kg-video-card" data-kg-thumbnail="https://example.com/thumb.jpg"',
      ),
    ).querySelector('video');
    expect(video?.getAttribute('poster')).toBe('https://example.com/thumb.jpg');
  });
});

describe('getHelpArticleSlug', () => {
  it.each([
    ['https://ghost.org/help/stripe/', 'stripe'],
    ['https://ghost.org/help/using-custom-domains', 'using-custom-domains'],
    ['https://ghost.org/help/topic/faq/', null],
    ['https://ghost.org/help/manual/', null],
    ['https://ghost.org/pricing/', null],
    ['https://example.com/help/stripe/', null],
  ])('reads %s as %s', (href, slug) => {
    expect(getHelpArticleSlug(href)).toBe(slug);
  });
});
