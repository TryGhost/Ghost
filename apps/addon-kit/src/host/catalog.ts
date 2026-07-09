import {useEffect, useMemo, useState} from 'react';
import {fetchManifest} from './installs.ts';
import type {AddonManifest} from '../types.ts';

/**
 * The marketplace catalog: a hardcoded list of manifest URLs (spike). Display
 * data comes from the manifests themselves, so a future real marketplace is
 * just a different source for this list.
 */
export const MARKETPLACE_CATALOG: string[] = [
    'http://localhost:4650/manifest.json'
];

export interface MarketplaceCatalogItem {
    manifestUrl: string;
    manifest?: AddonManifest;
    error?: string;
}

export interface UseMarketplaceCatalogResult {
    items: MarketplaceCatalogItem[];
    isLoading: boolean;
}

export function useMarketplaceCatalog(): UseMarketplaceCatalogResult {
    const [items, setItems] = useState<MarketplaceCatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        Promise.all(MARKETPLACE_CATALOG.map(async (manifestUrl): Promise<MarketplaceCatalogItem> => {
            try {
                return {manifestUrl, manifest: await fetchManifest(manifestUrl)};
            } catch (error) {
                return {manifestUrl, error: String(error)};
            }
        })).then((resolved) => {
            if (!cancelled) {
                setItems(resolved);
                setIsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return useMemo(() => ({items, isLoading}), [items, isLoading]);
}
