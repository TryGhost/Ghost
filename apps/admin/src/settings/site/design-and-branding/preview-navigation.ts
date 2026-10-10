// Portal's own triggers: they open its popup rather than go anywhere
const PORTAL_LINK = '[data-portal], a[href^="#/portal"]';

function withoutHash(url: URL): string {
  return url.href.replace(/#.*$/, '');
}

/**
 * Lets a written preview of a site page be browsed: clicking one of the
 * site's own links asks for that page instead (`onNavigate`), so it can be
 * previewed the same way; a link elsewhere opens in a new tab, and a link to
 * a spot on the page scrolls to it. Forms and Portal stay inert, as they'd
 * act on the live site. A modified click, or a link to a new tab, keeps its
 * own way. Listeners go on the written document, so attach once it's written.
 */
export function followPreviewLinks(
  doc: Document,
  pageUrl: string,
  onNavigate: (url: string) => void,
): void {
  const page = new URL(pageUrl);

  doc.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof doc.defaultView!.Element ? event.target : null;
      const portalLink = target?.closest(PORTAL_LINK);
      if (portalLink) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        (anchor.target && anchor.target !== '_self')
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.getAttribute('href')!, page);
      } catch {
        return;
      }
      if (!/^https?:$/.test(url.protocol)) {
        return;
      }
      event.preventDefault();

      if (url.origin !== page.origin) {
        window.open(url.href, '_blank', 'noopener');
        return;
      }
      if (withoutHash(url) === withoutHash(page)) {
        const id = decodeURIComponent(url.hash.slice(1));
        doc.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      onNavigate(withoutHash(url));
    },
    true,
  );

  doc.addEventListener('submit', (event) => event.preventDefault(), true);
}
