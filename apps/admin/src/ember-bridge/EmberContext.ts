import { createContext, useContext } from "react";

export interface EmberContextType {
    isFallbackPresent: boolean;
    registerFallback: () => void;
    unregisterFallback: () => void;
}

export const EmberContext = createContext<EmberContextType | undefined>(
    undefined
);

export function useEmberContext() {
    const context = useContext(EmberContext);
    if (context === undefined) {
        throw new Error("useEmberContext must be used within an EmberProvider");
    }
    return context;
}
