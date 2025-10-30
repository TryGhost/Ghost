export interface EmberBridge {
    state: StateBridge;
}

export interface StateBridge {
    onUpdate: (dataType: string, response: unknown) => void;
    onInvalidate: (dataType: string) => void;
    onDelete: (dataType: string, id: string) => void;
}

declare global {
    interface Window {
        EmberBridge?: EmberBridge;
    }
}
