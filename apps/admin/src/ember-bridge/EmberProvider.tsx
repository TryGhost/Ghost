import { useState, useCallback, type ReactNode } from "react";
import { EmberContext, type EmberContextType } from "./EmberContext";


interface EmberProviderProps {
    children: ReactNode;
}

export function EmberProvider({ children }: EmberProviderProps) {
    const [fallbackCount, setFallbackCount] = useState(0);

    const registerFallback = useCallback(() => {
        setFallbackCount((prev) => prev + 1);
    }, []);

    const unregisterFallback = useCallback(() => {
        setFallbackCount((prev) => Math.max(0, prev - 1));
    }, []);

    const isFallbackPresent = fallbackCount > 0;

    const value: EmberContextType = {
        isFallbackPresent,
        registerFallback,
        unregisterFallback,
    };

    return (
        <EmberContext.Provider value={value}>{children}</EmberContext.Provider>
    );
}
