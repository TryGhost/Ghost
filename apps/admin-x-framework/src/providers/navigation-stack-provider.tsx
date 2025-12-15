import React, {useCallback, useEffect, useState, useRef} from 'react';
import {useLocation, useNavigate, useNavigationType} from 'react-router';

/**
 * React Router doesn't offer navigation stack tracking, so a custom provider
 * is added here.
 */
interface NavigationStackContextType {
    stack: string[];
    previousPath: string | null,
    canGoBack: boolean;
    resetStack: () => void;
}

export interface NavigationStackProviderProps {
    children: React.ReactNode;
    maxStackSize?: number;
}

const NavigationStackContext = React.createContext<NavigationStackContextType>({
    stack: [],
    previousPath: null,
    canGoBack: false,
    resetStack: () => {}
});

export function NavigationStackProvider({
    children,
    maxStackSize = 100
}: NavigationStackProviderProps) {
    const location = useLocation();
    const navigationType = useNavigationType();
    const [stack, setStack] = useState<string[]>([]);
    const isInitializedRef = useRef(false);
    const lastPathRef = useRef(location.pathname);

    const resetStack = useCallback(() => {
        setStack([location.pathname]);
        lastPathRef.current = location.pathname;
        isInitializedRef.current = false;
    }, [location.pathname]);

    useEffect(() => {
        // Initialize stack if not initialized
        if (!isInitializedRef.current) {
            setStack([location.pathname]);
            lastPathRef.current = location.pathname;
            isInitializedRef.current = true;
            return;
        }

        // Skip if the path hasn't changed
        if (lastPathRef.current === location.pathname) {
            return;
        }

        // Update last path
        lastPathRef.current = location.pathname;

        if (navigationType === 'PUSH') {
            setStack((prev) => {
                const newStack = [...prev, location.pathname];
                return newStack.slice(-maxStackSize);
            });
        } else if (navigationType === 'POP') {
            setStack((prev) => {
                // When popping, we want to keep the current path in the stack
                // and remove the previous one
                const newStack = [...prev];
                newStack.pop();
                return newStack;
            });
        } else if (navigationType === 'REPLACE') {
            setStack((prev) => {
                const newStack = [...prev.slice(0, -1), location.pathname];
                return newStack.slice(-maxStackSize);
            });
        }
    }, [location, navigationType, maxStackSize]);

    const previousPath = stack.length > 1 ? stack[stack.length - 2] : null;
    const canGoBack = stack.length > 1;

    return (
        <NavigationStackContext.Provider value={{stack, previousPath, canGoBack, resetStack}}>
            {children}
        </NavigationStackContext.Provider>
    );
}

export function useNavigationStack() {
    const context = React.useContext(NavigationStackContext);
    const navigate = useNavigate();

    if (!context) {
        throw new Error('useNavigationStack must be within a NavigationStackProvider');
    }

    const goBack = useCallback(() => {
        if (context.canGoBack) {
            navigate(-1);
        }
    }, [context.canGoBack, navigate]);

    return {
        ...context,
        goBack
    };
}
