import { useEffect, useState } from "react";

export interface EmberBridge {
    getService: (serviceName: string) => unknown;
}

export interface StateBridge {
    nightShift: null |boolean;
    setNightShift: (value: boolean) => void;
    on: (event: string, callback: (value: boolean) => void) => void;
    off: (event: string, callback: (value: boolean) => void) => void;
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

export function useEmberDarkMode(): [boolean, () => void] {
    const stateBridge = useEmberService('state-bridge') as StateBridge;
    const [darkMode, setDarkMode] = useState(stateBridge?.nightShift ?? false);

    useEffect(() => {
        if (!stateBridge) {
            return;
        }

        const onNightShiftUpdated = (value: boolean) => {
            setDarkMode(value);
        };

        setDarkMode(stateBridge.nightShift ?? false);
        stateBridge.on('nightShiftUpdated', onNightShiftUpdated);

        return () => {
            stateBridge.off('nightShiftUpdated', onNightShiftUpdated);
        }
    }, [stateBridge]);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        stateBridge.setNightShift(!darkMode);
    }

    return [darkMode, toggleDarkMode];
}
