import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate, useNavigationType} from 'react-router';

/**
 * React Router doesn't offer navigation stack tracking, so a custom provider
 * is added here.
 */
interface NavigationStackContextType {
    stack: string[];
    previousPath: string | null,
    canGoBack: boolean;
}

export interface NavigationStackProviderProps {
    children: React.ReactNode;
    maxStackSize?: number;
}

const NavigationStackContext = React.createContext<NavigationStackContextType>({
    stack: [],
    previousPath: null,
    canGoBack: false
});

export function NavigationStackProvider({
    children,
    maxStackSize = 100
}: NavigationStackProviderProps) {
    const location = useLocation();
    const navigationType = useNavigationType();
    const [stack, setStack] = useState<string[]>([]);

    useEffect(() => {
        if (navigationType === 'PUSH') {
            setStack((prev) => {
                const newStack = [...prev, location.pathname];
                return newStack.slice(-maxStackSize);
            });
        } else if (navigationType === 'POP') {
            setStack(prev => prev.slice(0, -1));
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
        <NavigationStackContext.Provider value={{stack, previousPath, canGoBack}}>
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
