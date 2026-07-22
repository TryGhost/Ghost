import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScrollSpyContext } from "./use-scroll-spy";

/**
 * Scroll-spy provider for the settings main pane, ported from the legacy
 * use-scroll-section hook: an IntersectionObserver tracks which registered
 * group sections are in view, and `currentSection` resolves to the
 * navigated group while it's visible, then the topmost intersecting group,
 * then the last group seen. The sidebar highlights the nav item owning
 * `currentSection`.
 */

// The legacy hook kept sections ordered by viewport position and tracked
// drop-outs incrementally; ported as-is.
function getIntersectingSections(
    current: string[],
    entries: IntersectionObserverEntry[],
    sectionElements: Record<string, HTMLElement>,
) {
    const entriesWithId = entries
        .map(({ isIntersecting, target }) => ({
            isIntersecting,
            id: Object.entries(sectionElements).find(([, element]) => element === target)?.[0],
        }))
        .filter((entry): entry is { id: string; isIntersecting: boolean } => Boolean(entry.id));

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
}

export function ScrollSpyProvider({ navigatedSection, children }: {
    /** The navid the router last navigated to, preferred while visible. */
    navigatedSection: string | null;
    children: ReactNode;
}) {
    const sectionElements = useRef<Record<string, HTMLElement>>({});
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [intersectingSections, setIntersectingSections] = useState<string[]>([]);
    const [lastIntersectedSection, setLastIntersectedSection] = useState<string | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            setIntersectingSections((sections) => {
                const newSections = getIntersectingSections(sections, entries, sectionElements.current);
                if (newSections.length) {
                    setLastIntersectedSection(newSections[0]);
                }
                return newSections;
            });
        }, {
            // The native chrome scrolls groups to 64px from the top
            // (scroll-mt-16); mirror the legacy margins relative to that
            // offset (50px above it, bottom 40% ignored).
            rootMargin: "-14px 0px -40% 0px",
        });
        observerRef.current = observer;
        // Child effects run before this one — observe anything already
        // registered.
        Object.values(sectionElements.current).forEach((element) => observer.observe(element));
        return () => {
            observerRef.current = null;
            observer.disconnect();
        };
    }, []);

    const registerSection = useCallback((id: string, element: HTMLElement) => {
        const previous = sectionElements.current[id];
        if (previous && previous !== element) {
            observerRef.current?.unobserve(previous);
        }
        sectionElements.current[id] = element;
        observerRef.current?.observe(element);
        return () => {
            if (sectionElements.current[id] !== element) {
                return;
            }
            delete sectionElements.current[id];
            observerRef.current?.unobserve(element);
            setIntersectingSections((sections) => sections.filter((section) => section !== id));
        };
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

    const contextValue = useMemo(() => ({ registerSection, currentSection }), [registerSection, currentSection]);

    return (
        <ScrollSpyContext.Provider value={contextValue}>
            {children}
        </ScrollSpyContext.Provider>
    );
}
