import {useMemo, useRef} from 'react';
import type {FilterOption} from '@tryghost/shade';

type ArrayItem<T, K extends keyof T> = NonNullable<T[K]> extends Array<infer Item> ? Item : never;

export interface UseResolveActiveValuesOptions<T, K extends keyof T & string> {
    dataKey: K;
    toOption: (item: ArrayItem<T, K>) => FilterOption<string>;
    useGetById: (id: string, opts: { enabled: boolean; defaultErrorHandler: boolean }) => { data: Pick<T, K> | undefined; isError: boolean };
    activeValues: string[];
    /** Items already available in the current data set */
    knownItems: ArrayItem<T, K>[];
}

export interface UseResolveActiveValuesReturn<T, K extends keyof T & string> {
    /** All items resolved via useGetById (append-only) */
    resolvedItems: ArrayItem<T, K>[];
    /** The most recently resolved raw item (for dependency tracking) */
    resolvedRawItem: ArrayItem<T, K> | null;
}

/**
 * Resolves active filter values that aren't present in the current data page
 * by fetching them one at a time via useGetById.
 */
export function useResolveActiveValues<T, K extends keyof T & string>({
    dataKey,
    toOption,
    useGetById: useResolveById,
    activeValues,
    knownItems
}: UseResolveActiveValuesOptions<T, K>): UseResolveActiveValuesReturn<T, K> {
    // Append-only resolved items used for populating dropdown options
    const resolvedForOptionsRef = useRef<ArrayItem<T, K>[]>([]);
    // Track IDs that failed resolution to avoid retrying
    const failedResolutionsRef = useRef(new Set<string>());

    // Find the first active value missing from known + resolved items
    const resolvedValues = resolvedForOptionsRef.current;
    const missingValue = useMemo(() => {
        if (activeValues.length === 0) {
            return '';
        }
        const knownValueSet = new Set<string>();
        for (const item of knownItems) {
            knownValueSet.add(toOption(item).value);
        }
        for (const item of resolvedValues) {
            knownValueSet.add(toOption(item).value);
        }
        return activeValues.find(v => !knownValueSet.has(v) && !failedResolutionsRef.current.has(v)) || '';
    }, [activeValues, knownItems, resolvedValues, toOption]);

    // Always call the hook (hooks must be unconditional)
    const resolvedResult = useResolveById(missingValue || '', {
        enabled: !!missingValue,
        defaultErrorHandler: false
    });

    // Extract resolved raw item from the fetch result
    const resolvedRawItem = useMemo((): ArrayItem<T, K> | null => {
        if (!resolvedResult.data || !missingValue) {
            return null;
        }
        const arr = resolvedResult.data[dataKey];
        if (Array.isArray(arr) && arr.length > 0) {
            return arr[0] as ArrayItem<T, K>;
        }
        return null;
    }, [resolvedResult.data, missingValue, dataKey]);

    // Track failed resolutions
    if (missingValue && resolvedResult.isError) {
        failedResolutionsRef.current.add(missingValue);
    }

    // Append resolved item to the ref
    if (resolvedRawItem) {
        const resolvedValue = toOption(resolvedRawItem).value;
        if (!resolvedForOptionsRef.current.some(existing => toOption(existing).value === resolvedValue)) {
            resolvedForOptionsRef.current = [...resolvedForOptionsRef.current, resolvedRawItem];
        }
    }

    return {
        resolvedItems: resolvedForOptionsRef.current,
        resolvedRawItem
    };
}
