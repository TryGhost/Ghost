import { createContext, useContext, useEffect, useRef } from "react";

/**
 * Scroll-spy context for the settings main pane, ported from the legacy
 * use-scroll-section hook: every setting group registers its element under
 * its navid, and `currentSection` resolves to the group the sidebar should
 * highlight. Kept separate from the provider component (scroll-spy.tsx) so
 * that file only exports components (react-refresh/only-export-components).
 */
export interface ScrollSpy {
    /** Registers a group element under its navid; returns the unregister. */
    registerSection: (id: string, element: HTMLElement) => () => void;
    currentSection: string | null;
}

export const ScrollSpyContext = createContext<ScrollSpy>({
    registerSection: () => () => {},
    currentSection: null,
});

export const useScrollSpy = () => useContext(ScrollSpyContext);

/** Registers the returned ref's element as the scroll-spy section `id`. */
export function useScrollSpySection(id?: string) {
    const { registerSection } = useScrollSpy();
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!id || !ref.current) {
            return;
        }
        return registerSection(id, ref.current);
    }, [id, registerSection]);

    return ref;
}
