// This script runs in the head, before the browser parses the bar or any theme content.
(() => {
  const page = document.documentElement;
  const script = document.currentScript;
  const content = script.dataset.announcement;
  const preview = script.hasAttribute('data-preview');
  const visibilityKey = 'isAnnouncementBarVisible';
  const contentKey = 'announcementBarContent';
  if (!preview) {
    try {
      if (
        sessionStorage.getItem(contentKey) === content &&
        !sessionStorage.getItem(visibilityKey)
      ) {
        page.setAttribute('data-gh-announcement-dismissed', '');
        return;
      }
      sessionStorage.setItem(contentKey, content);
      sessionStorage.setItem(visibilityKey, 'true');
    } catch {
      // Storage may be disabled. The bar can still be dismissed on this page.
    }
  }

  const offsets = new Map();
  let frame;
  let bar;
  let candidates = [];
  let refreshHeaders = true;

  function findHeaders() {
    const headers = new Map();
    const selector =
      'header, nav, [role="banner"], [role="navigation"], [data-ghost-header], #gh-head, #gh-navigation';
    const landmarks = new Set(document.querySelectorAll(selector));
    // Some themes build their masthead entirely from divs. Check the top edge and
    // the edge below the bar (where a masthead we already offset will now sit).
    for (const y of [1, bar.getBoundingClientRect().bottom + 1]) {
      if (y < 0 || y >= window.innerHeight) {
        continue;
      }
      for (const el of document.elementsFromPoint(page.clientWidth / 2, y)) {
        const position = getComputedStyle(el).position;
        if (position !== 'fixed' && position !== 'absolute') {
          continue;
        }
        const box = el.getBoundingClientRect();
        if (
          box.width >= page.clientWidth / 2 &&
          box.height < window.innerHeight / 2 &&
          el.querySelector('a[href]')
        ) {
          landmarks.add(el);
        }
      }
    }
    for (const header of landmarks) {
      if (header.closest('article, footer, aside, dialog, #announcement-bar-root')) {
        continue;
      }
      // A theme may position the header's wrapper instead of the header itself.
      let candidate;
      for (let el = header; el && el !== document.body; el = el.parentElement) {
        const position = getComputedStyle(el).position;
        if (position === 'fixed' || position === 'absolute') {
          candidate = { el, position };
          // A fixed child is anchored to the viewport in the usual case, even inside
          // an absolutely positioned wrapper.
          if (position === 'fixed') {
            break;
          }
        }
      }
      if (candidate && !candidate.el.contains(bar)) {
        headers.set(candidate.el, candidate);
      }
    }
    return [...headers.values()];
  }

  function layout() {
    if (!bar) {
      bar = document.querySelector('#announcement-bar-root > .gh-announcement-bar');
      if (!bar) {
        return;
      }
      size.observe(bar);
    }
    const bounds = bar.getBoundingClientRect();
    const height = bounds.height + 'px';
    if (page.style.getPropertyValue('--gh-announcement-bar-height') !== height) {
      page.style.setProperty('--gh-announcement-bar-height', height);
    }
    if (refreshHeaders) {
      candidates = findHeaders();
      refreshHeaders = false;
    }

    const needed = new Map();
    for (const { el, position } of candidates) {
      const box = el.getBoundingClientRect();
      const previous = offsets.get(el)?.amount || 0;
      const top = box.top - previous;
      if (box.height && top < bounds.bottom && top + box.height > bounds.top) {
        const amount =
          position === 'fixed'
            ? Math.max(0, Math.min(bounds.height, bounds.bottom))
            : bounds.height;
        if (amount > 0) {
          needed.set(el, amount);
        }
      }
    }
    for (const [el, offset] of offsets) {
      if (needed.get(el) !== offset.amount) {
        offset.animation.cancel();
        offsets.delete(el);
      }
    }
    for (const [el, amount] of needed) {
      if (!offsets.has(el)) {
        // Add to the theme's margin, preserving its top, transform, transitions and inline styles.
        const marginTop = amount + 'px';
        const animation = el.animate([{ marginTop }, { marginTop }], {
          fill: 'both',
          composite: 'add',
        });
        offsets.set(el, { amount, animation });
      }
    }
  }

  function schedule() {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = undefined;
        layout();
      });
    }
  }
  function refresh() {
    refreshHeaders = true;
    schedule();
  }
  function onScroll() {
    if (candidates.some(({ position }) => position === 'fixed')) {
      schedule();
    }
  }
  const size = new ResizeObserver(layout);
  const changes = new MutationObserver(() => {
    refreshHeaders = true;
    if (document.readyState === 'loading') {
      layout();
    } else {
      schedule();
    }
  });
  changes.observe(page, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refresh);
  schedule();

  function hide() {
    window.removeEventListener('pageshow', restoreDismissal);
    changes.disconnect();
    size.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', refresh);
    document.removeEventListener('click', dismiss);
    for (const { animation } of offsets.values()) {
      animation.cancel();
    }
    page.setAttribute('data-gh-announcement-dismissed', '');
    page.style.removeProperty('--gh-announcement-bar-height');
  }
  function restoreDismissal(event) {
    if (!event.persisted || preview) {
      return;
    }
    try {
      if (
        sessionStorage.getItem(contentKey) === content &&
        !sessionStorage.getItem(visibilityKey)
      ) {
        hide();
      }
    } catch {
      // Storage can be unavailable after restoring a page.
    }
  }
  function dismiss(event) {
    if (!event.target.closest?.('#announcement-bar-root > .gh-announcement-bar > button')) {
      return;
    }
    hide();
    if (!preview) {
      try {
        sessionStorage.removeItem(visibilityKey);
      } catch {
        // Page-local dismissal still works without storage.
      }
    }
  }
  document.addEventListener('click', dismiss);
  window.addEventListener('pageshow', restoreDismissal);
})();
