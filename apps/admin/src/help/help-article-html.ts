import DOMPurify from 'dompurify';

/*
 * Turns a help center article's HTML into something safe and readable inside
 * Admin (covered by help-article-html.test.ts). The article view
 * (help-article-view.tsx) renders the result and styles it.
 *
 * - Sanitized with DOMPurify (no scripts, event handlers or javascript: links),
 *   without inline styles, and keeping only Ghost's own kg-… classes, so an
 *   article can't reuse Admin's classes to restyle or cover Admin.
 * - Ids are prefixed by DOMPurify (SANITIZE_NAMED_PROPS), so they can't clash
 *   with Admin's or shadow document properties (an article's #images would
 *   otherwise be dropped), and links to them (in-article anchors) are marked
 *   for the view to scroll to: as they are, they'd change Admin's route.
 * - Links to other help articles are marked for the view to open in the panel;
 *   other links open in a new tab.
 * - Ghost's interactive cards rely on scripts on the help center's pages,
 *   which don't run here, so they're rebuilt from plain HTML: toggles (FAQ
 *   items) as native disclosures, video and audio with the browser's own
 *   controls, and their icons removed. Embeds (iframes: YouTube and the like)
 *   are dropped.
 */

const FORBID_TAGS = ['style', 'iframe', 'form', 'input', 'button'];
const FORBID_ATTR = ['style'];

/** The prefix DOMPurify gives an article's ids (SANITIZE_NAMED_PROPS). */
export const ARTICLE_ID_PREFIX = 'user-content-';

/** A link to another help center article (ghost.org/help/<slug>/): its slug. */
export function getHelpArticleSlug(href: string): string | null {
  try {
    const url = new URL(href);
    const match = /^\/help\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    const onHelpCenter = url.hostname === 'ghost.org' || url.hostname === 'www.ghost.org';
    // Topic and manual pages are listings, not articles
    return onHelpCenter && match?.[1] && !['topic', 'manual'].includes(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

/** A toggle card (a collapsible FAQ item) as a native disclosure. */
function rebuildToggle(card: Element) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = card.querySelector('.kg-toggle-heading-text')?.textContent?.trim() ?? '';
  details.append(summary, ...(card.querySelector('.kg-toggle-content')?.childNodes ?? []));
  card.replaceWith(details);
}

/** A video or audio card with the browser's own controls instead of Ghost's player. */
function showNativePlayer(card: Element) {
  card.querySelectorAll('video, audio').forEach((media) => media.setAttribute('controls', ''));
  // The thumbnail was the video's background (an inline style, removed)
  const thumbnail = card.getAttribute('data-kg-thumbnail');
  if (thumbnail?.startsWith('https://')) {
    card.querySelector('video')?.setAttribute('poster', thumbnail);
  }
  card
    .querySelectorAll(
      '.kg-video-overlay, .kg-video-player-container, .kg-audio-player-container, .kg-audio-thumbnail',
    )
    .forEach((player) => player.remove());
}

/** Keeps only Ghost's own card classes, which the article view styles. */
function keepCardClasses(element: Element) {
  const kept = [...element.classList].filter((name) => name.startsWith('kg-'));
  if (kept.length) {
    element.setAttribute('class', kept.join(' '));
  } else {
    element.removeAttribute('class');
  }
}

/** Marks a link for the article view: to an anchor in the article, another article, or elsewhere. */
function prepareLink(link: HTMLAnchorElement) {
  const href = link.getAttribute('href') ?? '';
  if (href.startsWith('#')) {
    link.setAttribute('data-help-anchor', `${ARTICLE_ID_PREFIX}${href.slice(1)}`);
    return;
  }
  const slug = getHelpArticleSlug(href);
  if (slug) {
    link.setAttribute('data-help-slug', slug);
  }
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
}

/** The article's HTML, safe to render in Admin, with cards it can show and links marked. */
export function prepareArticleHtml(html: string) {
  // A template's content is inert: nothing in it loads or runs
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(html, {
    FORBID_TAGS,
    FORBID_ATTR,
    SANITIZE_NAMED_PROPS: true,
  });
  const content = template.content;

  content.querySelectorAll('.kg-toggle-card').forEach(rebuildToggle);
  content.querySelectorAll('.kg-video-card, .kg-audio-card').forEach(showNativePlayer);
  // Icons for the players and cards above; unsized, they'd fill the panel
  content.querySelectorAll('svg').forEach((icon) => icon.remove());
  content.querySelectorAll('[class]').forEach(keepCardClasses);
  content.querySelectorAll('a').forEach(prepareLink);

  return template.innerHTML;
}
