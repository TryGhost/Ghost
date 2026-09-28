import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { ScrollSectionContext } from './use-scroll-section';

const LEGACY_SCROLL_MARGIN = 193;
const ADMIN7_SETTINGS_SCROLL_MARGIN = 96;

const scrollToSection = (
  element: HTMLDivElement,
  doneInitialScroll: boolean,
  scrollMargin: number,
) => {
  const root = document.getElementById('settings-scroller')!;
  const top = element.getBoundingClientRect().top + root.scrollTop;

  root.scrollTo({
    behavior: doneInitialScroll ? 'smooth' : 'instant',
    top: top - scrollMargin,
  });
};

const scrollSidebarNav = (navElement: HTMLLIElement, doneInitialScroll: boolean) => {
  const sidebar = document.getElementById('settings-sidebar-scroller');

  // With admin7settings on mobile, the nav only exists while its sheet is open,
  // so the registered element can be detached and the scroller missing.
  if (!sidebar || !navElement.isConnected) {
    return;
  }

  const bounds = navElement.getBoundingClientRect();

  const parentBounds = sidebar.getBoundingClientRect();
  const offsetTop = parentBounds.top + 40;

  if (
    bounds.top >= offsetTop &&
    bounds.left >= parentBounds.left &&
    bounds.right <= parentBounds.right &&
    bounds.bottom <= parentBounds.bottom
  ) {
    return;
  }

  if (!['auto', 'scroll'].includes(getComputedStyle(sidebar).overflowY)) {
    return;
  }

  const behavior = doneInitialScroll ? 'smooth' : 'instant';

  // If this is the first nav item, scroll to top
  if (sidebar.querySelector('[data-setting-nav-item]') === navElement) {
    sidebar.scrollTo({
      top: 0,
      behavior,
    });
  } else if (bounds.top < offsetTop) {
    sidebar.scrollTo({
      top: sidebar.scrollTop + bounds.top - offsetTop,
      behavior,
    });
  } else {
    sidebar.scrollTo({
      top:
        sidebar.scrollTop + bounds.top - parentBounds.top - parentBounds.height + bounds.height + 4,
      behavior,
    });
  }
};

const isScrolledToBottom = (root: HTMLElement) =>
  root.scrollHeight - root.scrollTop - root.clientHeight <= 1;

/**
 * Sections whose anchor is inside the scroller's viewport, in document order.
 * Section anchors are zero-size, so hidden (search-filtered) ones are detected
 * by having no client rects.
 */
const getSectionsInView = (root: HTMLElement, sectionElements: Record<string, HTMLDivElement>) => {
  const bounds = root.getBoundingClientRect();

  return Object.entries(sectionElements)
    .filter(([, element]) => element.isConnected && element.getClientRects().length > 0)
    .map(([id, element]) => ({ id, top: element.getBoundingClientRect().top }))
    .filter(({ top }) => top >= bounds.top && top < bounds.bottom)
    .sort((first, second) => first.top - second.top)
    .map(({ id }) => id);
};

const getIntersectingSections = (
  current: string[],
  entries: IntersectionObserverEntry[],
  sectionElements: Record<string, HTMLDivElement>,
) => {
  const entriesWithId = entries
    .map(({ isIntersecting, target }) => ({
      isIntersecting,
      id: Object.entries(sectionElements).find(([, element]) => element === target)?.[0],
    }))
    .filter((entry) => entry.id) as { id: string; isIntersecting: boolean }[];

  const newlyIntersectingIds = entriesWithId
    .filter((entry) => !current.includes(entry.id) && entry.isIntersecting)
    .map((entry) => entry.id);
  const unintersectingIds = entriesWithId
    .filter((entry) => !entry.isIntersecting)
    .map((entry) => entry.id);

  const newSections = current
    .filter((section) => !unintersectingIds.includes(section))
    .concat(newlyIntersectingIds);

  newSections.sort((first, second) => {
    const firstElement = sectionElements[first];
    const secondElement = sectionElements[second];

    if (!firstElement || !secondElement) {
      return 0;
    }

    return firstElement.getBoundingClientRect().top - secondElement.getBoundingClientRect().top;
  });

  return newSections;
};

export const ScrollSectionProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {
  const admin7Settings = useFeatureFlag('admin7settings');
  const scrollMargin = admin7Settings ? ADMIN7_SETTINGS_SCROLL_MARGIN : LEGACY_SCROLL_MARGIN;
  const [navigatedSection, _setNavigatedSection] = useState<string | null>(null);
  const sectionElements = useRef<Record<string, HTMLDivElement>>({});
  const intersectionObserver = useRef<IntersectionObserver | null>(null);
  const [intersectingSections, setIntersectingSections] = useState<string[]>([]);
  const [lastIntersectedSection, setLastIntersectedSection] = useState<string | null>(null);

  const [hasUpdatedNavigatedSection, setHasUpdatedNavigatedSection] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [doneInitialScroll, setDoneInitialScroll] = useState(false);
  const [, setDoneSidebarScroll] = useState(false);

  const setNavigatedSection = useCallback((value: string) => {
    _setNavigatedSection(value);
    setHasUpdatedNavigatedSection(true);
  }, []);

  const navElements = useRef<Record<string, HTMLLIElement>>({});

  const setupIntersectionObserver = useCallback(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setIntersectingSections((sections) => {
          const newSections = getIntersectingSections(sections, entries, sectionElements.current);

          if (newSections.length) {
            setLastIntersectedSection(newSections[0]);
          }

          return newSections;
        });
      },
      {
        rootMargin: `-${scrollMargin - 50}px 0px -40% 0px`,
      },
    );

    Object.values(sectionElements.current).forEach((element) => observer.observe(element));

    return observer;
  }, [scrollMargin]);

  const updateSection = useCallback(
    (id: string, element: HTMLDivElement) => {
      if (sectionElements.current[id] === element) {
        return;
      }

      if (sectionElements.current[id]) {
        intersectionObserver.current?.unobserve(sectionElements.current[id]);
      }

      sectionElements.current[id] = element;
      intersectionObserver.current?.observe(element);

      if (!doneInitialScroll && id === navigatedSection) {
        scrollToSection(element, false, scrollMargin);
        setDoneInitialScroll(true);
      }
    },
    [intersectionObserver, navigatedSection, doneInitialScroll, scrollMargin],
  );

  const updateNav = useCallback((id: string, element: HTMLLIElement) => {
    navElements.current[id] = element;
  }, []);

  const scrollTo = useCallback(
    (id: string) => {
      if (sectionElements.current[id]) {
        scrollToSection(sectionElements.current[id], true, scrollMargin);
      }
    },
    [scrollMargin],
  );

  // Without the legacy 60vh bottom spacer, the last sections can't scroll into
  // the observer's zone, so at the bottom the spy falls back to what's in view.
  useEffect(() => {
    if (!admin7Settings) {
      return;
    }

    const handleScroll = (event: Event) => {
      if (event.target instanceof HTMLElement && event.target.id === 'settings-scroller') {
        setScrolledToBottom(isScrolledToBottom(event.target));
      }
    };

    // Capture on the document, since the scroller remounts with the settings content.
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, [admin7Settings]);

  const currentSection = useMemo(() => {
    const root = scrolledToBottom ? document.getElementById('settings-scroller') : null;
    if (root && isScrolledToBottom(root)) {
      const sectionsInView = getSectionsInView(root, sectionElements.current);

      if (navigatedSection && sectionsInView.includes(navigatedSection)) {
        return navigatedSection;
      }

      if (sectionsInView.length) {
        return sectionsInView[sectionsInView.length - 1];
      }
    }

    if (navigatedSection && intersectingSections.includes(navigatedSection)) {
      return navigatedSection;
    }

    if (intersectingSections.length) {
      return intersectingSections[0];
    }

    return lastIntersectedSection;
  }, [intersectingSections, lastIntersectedSection, navigatedSection, scrolledToBottom]);

  useEffect(() => {
    if (!hasUpdatedNavigatedSection) {
      return;
    }

    if (navigatedSection && sectionElements.current[navigatedSection]) {
      setDoneInitialScroll((done) => {
        scrollToSection(sectionElements.current[navigatedSection], done, scrollMargin);
        return true;
      });
    } else {
      // No navigated section means opening settings without a path
      setDoneInitialScroll(true);
    }

    // Wait for the initial scroll so that the intersecting sections are correct
    setTimeout(() => setupIntersectionObserver());
  }, [hasUpdatedNavigatedSection, navigatedSection, setupIntersectionObserver]);

  useEffect(() => {
    if (hasUpdatedNavigatedSection && currentSection && navElements.current[currentSection]) {
      setDoneSidebarScroll((done) => {
        scrollSidebarNav(navElements.current[currentSection], done);
        return true;
      });
    }
  }, [hasUpdatedNavigatedSection, currentSection]);

  return (
    <ScrollSectionContext.Provider
      value={{
        updateSection,
        updateNav,
        currentSection,
        updateNavigatedSection: setNavigatedSection,
        scrollToSection: scrollTo,
      }}
    >
      {children}
    </ScrollSectionContext.Provider>
  );
};
