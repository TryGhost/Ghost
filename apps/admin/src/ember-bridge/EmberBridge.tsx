import { useEffect, useState } from "react";

export interface EmberBridge {
    getService: (serviceName: string) => unknown;
}

declare global {
    interface Window {
        EmberBridge?: EmberBridge;
    }
}

export function useEmberService(serviceName: string) {
    const [service, setService] = useState<unknown>(null);

    useEffect(() => {
        const checkAndSetService = () => {
            if (window.EmberBridge) {
                setService(window.EmberBridge.getService(serviceName));
                return true;
            }
            return false;
        };

        if (checkAndSetService()) {
            return;
        }

        const pollForBridge = setInterval(() => {
            if (checkAndSetService()) {
                clearInterval(pollForBridge);
            }
        }, 100);

        return () => clearInterval(pollForBridge);
    }, [serviceName])

    return service;
}
