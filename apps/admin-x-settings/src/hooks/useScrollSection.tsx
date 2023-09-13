import {ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

interface ScrollSectionContextData {
    updateSection: (id: string, element: HTMLDivElement) => void;
    currentSection: string | null;
}

const ScrollSectionContext = createContext<ScrollSectionContextData>({
    updateSection: () => {},
    currentSection: null
});

export const useScrollSectionContext = () => useContext(ScrollSectionContext);

const scrollToSection = (element: HTMLDivElement) => {
    const root = document.getElementById('admin-x-root')!;
    const top = element.getBoundingClientRect().top + root.scrollTop;

    root.scrollTo({
        behavior: 'smooth',
        top: top - 193
    });
};

export const ScrollSectionProvider: React.FC<{
    navigatedSection: string;
    children: ReactNode;
}> = ({navigatedSection, children}) => {
    const sectionElements = useRef<Record<string, HTMLDivElement>>({});
    const [intersectingSections, setIntersectingSections] = useState<string[]>([]);
    const [lastIntersectedSection, setLastIntersectedSection] = useState<string | null>(null);
    const [doneInitialScroll, setDoneInitialScroll] = useState(false);

    const intersectionObserver = useMemo(() => new IntersectionObserver((entries) => {
        const entriesWithId = entries.map(({isIntersecting, target}) => ({
            isIntersecting,
            id: Object.entries(sectionElements.current).find(([, element]) => element === target)?.[0]
        })).filter(entry => entry.id) as {id: string; isIntersecting: boolean}[];

        setIntersectingSections((sections) => {
            const newlyIntersectingIds = entriesWithId.filter(entry => !sections.includes(entry.id) && entry.isIntersecting).map(entry => entry.id);
            const unintersectingIds = entriesWithId.filter(entry => !entry.isIntersecting).map(entry => entry.id);

            const newSections = sections.filter(section => !unintersectingIds.includes(section)).concat(newlyIntersectingIds);

            newSections.sort((first, second) => {
                const firstElement = sectionElements.current[first];
                const secondElement = sectionElements.current[second];

                if (!firstElement || !secondElement) {
                    return 0;
                }

                return firstElement.getBoundingClientRect().top - secondElement.getBoundingClientRect().top;
            });

            if (newSections.length) {
                setLastIntersectedSection(newSections[0]);
            }

            return newSections;
        });
    }, {
        rootMargin: '-20% 0px -40% 0px'
    }), []);

    const updateSection = useCallback((id: string, element: HTMLDivElement) => {
        if (sectionElements.current[id] === element) {
            return;
        }

        if (sectionElements.current[id]) {
            intersectionObserver.unobserve(sectionElements.current[id]);
        }

        sectionElements.current[id] = element;
        intersectionObserver.observe(element);

        if (!doneInitialScroll && id === navigatedSection) {
            scrollToSection(element);

            // element.scrollIntoView({behavior: 'smooth'});
            setDoneInitialScroll(true);
        }
    }, [intersectionObserver, navigatedSection, doneInitialScroll]);

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
        if (navigatedSection && sectionElements.current[navigatedSection]) {
            scrollToSection(sectionElements.current[navigatedSection]);
            setDoneInitialScroll(true);
        }
    }, [navigatedSection]);

    return (
        <ScrollSectionContext.Provider value={{
            updateSection,
            currentSection
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
