import {createContext, useContext, useEffect, useRef} from 'react';

export interface ScrollSectionContextData {
    updateSection: (id: string, element: HTMLDivElement) => void;
    updateNav: (id: string, element: HTMLLIElement) => void;
    currentSection: string | null;
    updateNavigatedSection: (id: string) => void;
    scrollToSection: (id: string) => void;
}

export const ScrollSectionContext = createContext<ScrollSectionContextData>({
    updateSection: () => {},
    updateNav: () => {},
    currentSection: null,
    updateNavigatedSection: () => {},
    scrollToSection: () => {}
});

export const useScrollSectionContext = () => useContext(ScrollSectionContext);

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

export const useScrollSectionNav = (id?: string | string[]) => {
    const {updateNav} = useScrollSectionContext();
    const ref = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (id && ref.current) {
            // Convert to array if it's a string
            const ids = Array.isArray(id) ? id : [id];

            // Register the nav element for all IDs
            ids.forEach((navId) => {
                updateNav(navId, ref.current!);
            });
        }
    }, [id, updateNav]);

    return {
        ref,
        props: {'data-setting-nav-item': true}
    };
};
