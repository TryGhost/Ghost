import {ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

interface ScrollSectionContextData {
    updateSection: (id: string, element: HTMLDivElement) => void;
    updateNav: (id: string, element: HTMLLIElement) => void;
    currentSection: string | null;
    updateNavigatedSection: (id: string) => void;
    scrollToSection: (id: string) => void;
}

const ScrollSectionContext = createContext<ScrollSectionContextData>({
    updateSection: () => {},
    updateNav: () => {},
    currentSection: null,
    updateNavigatedSection: () => {},
    scrollToSection: () => {}
});

export const useScrollSectionContext = () => useContext(ScrollSectionContext);

const scrollMargin = 193;

const scrollToSection = (element: HTMLDivElement, doneInitialScroll: boolean) => {
    const root = document.getElementById('admin-x-settings-scroller')!;
    const top = element.getBoundingClientRect().top + root.scrollTop;

    root.scrollTo({
        behavior: doneInitialScroll ? 'smooth' : 'instant',
        top: top - scrollMargin
    });
};

const scrollSidebarNav = (navElement: HTMLLIElement, doneInitialScroll: boolean) => {
    // const sidebar = document.getElementById('admin-x-settings-sidebar')!;
    const sidebar = document.getElementById('admin-x-settings-sidebar-scroller')!;

    const bounds = navElement.getBoundingClientRect();

    const parentBounds = sidebar.getBoundingClientRect();
    const offsetTop = parentBounds.top + 40;

    if (bounds.top >= offsetTop && bounds.left >= parentBounds.left && bounds.right <= parentBounds.right && bounds.bottom <= parentBounds.bottom) {
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
            behavior
        });
    } else if (bounds.top < offsetTop) {
        sidebar.scrollTo({
            top: sidebar.scrollTop + bounds.top - offsetTop,
            behavior
        });
    } else {
        sidebar.scrollTo({
            top: sidebar.scrollTop + bounds.top - parentBounds.top - parentBounds.height + bounds.height + 4,
            behavior
        });
    }
};

const getIntersectingSections = (current: string[], entries: IntersectionObserverEntry[], sectionElements: Record<string, HTMLDivElement>) => {
    const entriesWithId = entries.map(({isIntersecting, target}) => ({
        isIntersecting,
        id: Object.entries(sectionElements).find(([, element]) => element === target)?.[0]
    })).filter(entry => entry.id) as {id: string; isIntersecting: boolean}[];

    const newlyIntersectingIds = entriesWithId.filter(entry => !current.includes(entry.id) && entry.isIntersecting).map(entry => entry.id);
    const unintersectingIds = entriesWithId.filter(entry => !entry.isIntersecting).map(entry => entry.id);

    const newSections = current.filter(section => !unintersectingIds.includes(section)).concat(newlyIntersectingIds);

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
}> = ({children}) => {
    const [navigatedSection, _setNavigatedSection] = useState<string | null>(null);
    const sectionElements = useRef<Record<string, HTMLDivElement>>({});
    const intersectionObserver = useRef<IntersectionObserver | null>(null);
    const [intersectingSections, setIntersectingSections] = useState<string[]>([]);
    const [lastIntersectedSection, setLastIntersectedSection] = useState<string | null>(null);

    const [hasUpdatedNavigatedSection, setHasUpdatedNavigatedSection] = useState(false);
    const [doneInitialScroll, setDoneInitialScroll] = useState(false);
    const [, setDoneSidebarScroll] = useState(false);

    const setNavigatedSection = useCallback((value: string) => {
        _setNavigatedSection(value);
        setHasUpdatedNavigatedSection(true);
    }, []);

    const navElements = useRef<Record<string, HTMLLIElement>>({});

    const setupIntersectionObserver = useCallback(() => {
        const observer = new IntersectionObserver((entries) => {
            setIntersectingSections((sections) => {
                const newSections = getIntersectingSections(sections, entries, sectionElements.current);

                if (newSections.length) {
                    setLastIntersectedSection(newSections[0]);
                }

                return newSections;
            });
        }, {
            rootMargin: `-${scrollMargin - 50}px 0px -40% 0px`
        });

        Object.values(sectionElements.current).forEach(element => observer.observe(element));

        return observer;
    }, []);

    const updateSection = useCallback((id: string, element: HTMLDivElement) => {
        if (sectionElements.current[id] === element) {
            return;
        }

        if (sectionElements.current[id]) {
            intersectionObserver.current?.unobserve(sectionElements.current[id]);
        }

        sectionElements.current[id] = element;
        intersectionObserver.current?.observe(element);

        if (!doneInitialScroll && id === navigatedSection) {
            scrollToSection(element, false);
            setDoneInitialScroll(true);
        }
    }, [intersectionObserver, navigatedSection, doneInitialScroll]);

    const updateNav = useCallback((id: string, element: HTMLLIElement) => {
        navElements.current[id] = element;
    }, []);

    const scrollTo = useCallback((id: string) => {
        if (sectionElements.current[id]) {
            scrollToSection(sectionElements.current[id], true);
        }
    }, []);

    const currentSection = useMemo(() => {
        if (navigatedSection && intersectingSections.includes(navigatedSection)) {
            return navigatedSection;
        }

        if (intersectingSections.length) {
            return intersectingSections[0];
        }

        return lastIntersectedSection;
    }, [intersectingSections, lastIntersectedSection, navigatedSection]);

    useEffect(() => {
        if (!hasUpdatedNavigatedSection) {
            return;
        }

        if (navigatedSection && sectionElements.current[navigatedSection]) {
            setDoneInitialScroll((done) => {
                scrollToSection(sectionElements.current[navigatedSection], done);
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
        <ScrollSectionContext.Provider value={{
            updateSection,
            updateNav,
            currentSection,
            updateNavigatedSection: setNavigatedSection,
            scrollToSection: scrollTo
        }}>
            {children}
        </ScrollSectionContext.Provider>
    );
};

export const useScrollSection = (id?: string) => {
    const {updateSection} = useScrollSectionContext();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id && ref.current) {
            updateSection(id, ref.current);
        }
    }, [id, updateSection]);

    return {
        ref
    };
};

export const useScrollSectionNav = (id?: string) => {
    const {updateNav} = useScrollSectionContext();
    const ref = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (id && ref.current) {
            updateNav(id, ref.current);
        }
    }, [id, updateNav]);

    return {
        ref,
        props: {'data-setting-nav-item': true}
    };
};
