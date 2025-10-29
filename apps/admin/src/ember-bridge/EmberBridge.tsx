export interface EmberBridge {
    state: StateBridge;
}

export interface StateBridge {
    on: (event: string, callback: (value: boolean) => void) => void;
    off: (event: string, callback: (value: boolean) => void) => void;
    onUpdate: (...args: unknown[]) => void;
    onInvalidate: (...args: unknown[]) => void;
    onDelete: (...args: unknown[]) => void;
}

declare global {
    interface Window {
        EmberBridge?: EmberBridge;
    }
}
