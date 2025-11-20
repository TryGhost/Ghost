import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SubmenuContextType {
    hasActiveChild: boolean;
    registerActiveChild: () => void;
    unregisterActiveChild: () => void;
}

const SubmenuContext = createContext<SubmenuContextType | null>(null);

/**
 * Provider for submenu that tracks whether any child item is active.
 * Used to suppress parent link highlighting when a child is active.
 */
export function SubmenuProvider({ children }: { children: React.ReactNode }) {
    const [activeChildCount, setActiveChildCount] = useState(0);

    const registerActiveChild = useCallback(() => {
        setActiveChildCount(prev => prev + 1);
    }, []);

    const unregisterActiveChild = useCallback(() => {
        setActiveChildCount(prev => prev - 1);
    }, []);

    const value = React.useMemo(() => ({
        hasActiveChild: activeChildCount > 0,
        registerActiveChild,
        unregisterActiveChild
    }), [activeChildCount, registerActiveChild, unregisterActiveChild]);

    return (
        <SubmenuContext.Provider value={value}>
            {children}
        </SubmenuContext.Provider>
    );
}

/**
 * Hook for parent links to check if any submenu child is active.
 * Returns true if a child is currently active.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSubmenuHasActiveChild(): boolean {
    const context = useContext(SubmenuContext);
    return context?.hasActiveChild ?? false;
}

/**
 * Hook for child links to register/unregister themselves when active.
 * Call this from child links with their active state.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRegisterActiveChild(isActive: boolean) {
    const context = useContext(SubmenuContext);

    useEffect(() => {
        if (!context || !isActive) {
            return;
        }

        context.registerActiveChild();
        return () => {
            context.unregisterActiveChild();
        };
    }, [context, isActive]);
}
