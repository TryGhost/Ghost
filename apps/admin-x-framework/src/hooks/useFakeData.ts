import {useMemo, useState} from 'react';
import {createFakeDataProvider} from '../utils/fake-data';
import type {FakeDataConfig} from '../providers/FrameworkProvider';

/**
 * Reads the fake data preference from localStorage with SSR safety
 */
function getFakeDataEnabled(): boolean {
    try {
        return localStorage.getItem('ghost-fake-data') === 'true';
    } catch {
        // Fallback for SSR or when localStorage is unavailable
        return false;
    }
}

/**
 * Creates a complete fake data configuration object
 */
function createFakeDataConfig(enabled: boolean): FakeDataConfig | undefined {
    if (!enabled) {
        return undefined;
    }
    return {
        enabled: true,
        dataProvider: createFakeDataProvider()
    };
}

/**
 * Custom hook to manage fake data state and configuration
 * Reads from localStorage synchronously to avoid race conditions with API requests
 */
export function useFakeData(): FakeDataConfig | undefined {
    // Manage fake data state internally - read from localStorage synchronously to avoid race condition
    const [enabled] = useState(() => getFakeDataEnabled());

    // Create fake data config when enabled
    const fakeDataConfig = useMemo(() => createFakeDataConfig(enabled), [enabled]);

    return fakeDataConfig;
}