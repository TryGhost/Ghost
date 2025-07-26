import {useState, useEffect, useMemo} from 'react';
import {createTinybirdFakeDataProvider} from '../utils/fake-data';
import type {FakeDataConfig} from '../providers/FrameworkProvider';

interface TinybirdResponse {
    data: Array<Record<string, unknown>>;
    meta?: unknown;
}

interface UseFakeTinybirdDataOptions {
    fakeDataConfig?: FakeDataConfig;
    enabled: boolean;
    endpoint: string;
    params: Record<string, string>;
}

/**
 * Custom hook to handle fake Tinybird data fetching
 * Separated from useTinybirdQuery for cleaner code organization
 */
export function useFakeTinybirdData({fakeDataConfig, enabled, endpoint, params}: UseFakeTinybirdDataOptions) {
    const hasFakeData = fakeDataConfig?.enabled || false;
    
    const [fakeData, setFakeData] = useState<TinybirdResponse | null>(null);
    const [fakeLoading, setFakeLoading] = useState(false);
    const [fakeError, setFakeError] = useState<Error | null>(null);

    // Create fake data provider
    const fakeDataProvider = useMemo(() => {
        return hasFakeData ? createTinybirdFakeDataProvider() : null;
    }, [hasFakeData]);

    // Only memoize params if fake data is enabled to avoid unnecessary JSON.stringify
    const stableParams = useMemo(() => {
        return hasFakeData ? JSON.stringify(params) : '';
    }, [hasFakeData, params]);

    // Handle fake data fetching
    useEffect(() => {
        if (fakeDataProvider && enabled && endpoint) {
            setFakeLoading(true);
            setFakeError(null);
            
            fakeDataProvider(endpoint)
                .then((result) => {
                    if (result && typeof result === 'object' && 'data' in result) {
                        setFakeData({
                            data: (result as {data: Array<Record<string, unknown>>}).data,
                            meta: undefined // Tinybird fake data doesn't include meta
                        });
                    } else {
                        setFakeData(null);
                    }
                })
                .catch((err) => {
                    setFakeError(err instanceof Error ? err : new Error('Fake data provider failed'));
                    setFakeData(null);
                })
                .finally(() => {
                    setFakeLoading(false);
                });
        } else {
            setFakeData(null);
            setFakeLoading(false);
            setFakeError(null);
        }
    }, [fakeDataProvider, enabled, endpoint, stableParams]);

    return {
        fakeData,
        fakeLoading,
        fakeError,
        hasFakeData
    };
}