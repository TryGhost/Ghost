import {MULTISELECT_FIELDS} from './use-members-filter-state';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo} from 'react';
import {z} from 'zod';
import type {Filter} from '@tryghost/shade';

// Schema for a single view (color optional for member views)
const memberViewSchema = z.object({
    name: z.string(),
    route: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    filter: z.record(z.string(), z.string().nullable())
});

export type MemberView = z.infer<typeof memberViewSchema>;

/**
 * Convert Filter[] (UI state) to a record for storage
 * e.g., [{field: 'status', operator: 'is', values: ['paid']}] → {status: 'is:paid'}
 */
export function filtersToRecord(filters: Filter[]): Record<string, string> {
    const record: Record<string, string> = {};
    for (const filter of filters) {
        if (filter.values[0] !== undefined) {
            const serializedValue = MULTISELECT_FIELDS.has(filter.field) && filter.values.length > 1
                ? filter.values.map(v => String(v)).join(',')
                : String(filter.values[0]);
            record[filter.field] = `${filter.operator}:${serializedValue}`;
        }
    }
    return record;
}

/**
 * Convert a filter record to URL search params string
 * e.g., {status: 'is:paid'} → 'status=is%3Apaid'
 */
export function filterRecordToSearchParams(filter: Record<string, string | null>): URLSearchParams {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
        if (value !== null && value !== undefined) {
            params.set(key, value);
        }
    }
    return params;
}

/**
 * Check if two filter records are equal
 */
function isFilterEqual(a: Record<string, string | null>, b: Record<string, string | null>): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();

    if (aKeys.length !== bKeys.length) {
        return false;
    }

    return aKeys.every((key, i) => key === bKeys[i] && a[key] === b[key]);
}

/**
 * Read all shared views from settings
 */
function parseSharedViews(settingsData: {settings: Array<{key: string; value: string | boolean | null}>} | undefined): MemberView[] {
    const json = getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
    try {
        const parsed: unknown = JSON.parse(json);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.flatMap((item) => {
            const result = memberViewSchema.safeParse(item);
            return result.success ? [result.data] : [];
        });
    } catch {
        return [];
    }
}

/**
 * Generic hook to read shared views for any route from the shared_views setting
 */
export function useSharedViews(route: string): MemberView[] {
    const {data: settingsData} = useBrowseSettings();

    return useMemo(() => {
        return parseSharedViews(settingsData).filter(v => v.route === route);
    }, [settingsData, route]);
}

/**
 * Hook to read member views from the shared_views setting
 */
export function useMemberViews() {
    return useSharedViews('members');
}

/**
 * Hook to save a new member view
 */
export function useSaveMemberView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();

    const save = useCallback(async (name: string, filters: Filter[], originalView?: MemberView) => {
        const allViews = parseSharedViews(settingsData);
        const filterRecord = filtersToRecord(filters);

        let updatedViews: MemberView[];

        if (originalView) {
            // Edit mode: find original view by name and update it
            updatedViews = allViews.map(v => (v.route === 'members' &&
                v.name.trim().toLowerCase() === originalView.name.trim().toLowerCase()
                ? {...v, name: name.trim(), filter: filterRecord}
                : v
            ));
        } else {
            // Create mode: name is the identifier, no duplicates allowed
            const duplicate = allViews.find(v => v.route === 'members' &&
                v.name.trim().toLowerCase() === name.trim().toLowerCase()
            );

            if (duplicate) {
                throw new Error('A view with this name already exists');
            }

            updatedViews = [...allViews, {
                name: name.trim(),
                route: 'members',
                filter: filterRecord
            }];
        }

        await editSettings([{
            key: 'shared_views',
            value: JSON.stringify(updatedViews)
        }]);
    }, [settingsData, editSettings]);

    return save;
}

/**
 * Hook to delete a member view
 */
export function useDeleteMemberView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();

    const deleteView = useCallback(async (view: MemberView) => {
        const allViews = parseSharedViews(settingsData);
        // Match by name only — name is the canonical identifier for a member view
        const updatedViews = allViews.filter(v => !(v.route === 'members' &&
            v.name.trim().toLowerCase() === view.name.trim().toLowerCase())
        );

        await editSettings([{
            key: 'shared_views',
            value: JSON.stringify(updatedViews)
        }]);
    }, [settingsData, editSettings]);

    return deleteView;
}

/**
 * Find the active member view based on current filters
 */
export function useActiveMemberView(views: MemberView[], filters: Filter[]): MemberView | null {
    return useMemo(() => {
        if (filters.length === 0 || views.length === 0) {
            return null;
        }

        const currentFilter = filtersToRecord(filters);
        return views.find(v => isFilterEqual(v.filter, currentFilter)) ?? null;
    }, [views, filters]);
}
