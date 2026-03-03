import {MULTISELECT_FIELDS} from '../hooks/use-members-filter-state';
import {z} from 'zod';
import type {Filter} from '@tryghost/shade';

// Schema for a single view (color optional for member views)
export const memberViewSchema = z.object({
    name: z.string(),
    route: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    filter: z.record(z.string(), z.string().nullable())
});

export type MemberView = z.infer<typeof memberViewSchema>;

export type SharedViewsParseResult =
    | {ok: true; views: MemberView[]}
    | {ok: false; error: Error};

const VIEW_EXISTS_ERROR = 'A view with this name already exists';
const VIEW_UPDATE_NOT_FOUND_ERROR = 'Saved view could not be found for update';
const VIEW_UPDATE_AMBIGUOUS_ERROR = 'Multiple saved views matched update target';
const VIEW_DELETE_NOT_FOUND_ERROR = 'Saved view could not be found for delete';
const VIEW_DELETE_AMBIGUOUS_ERROR = 'Multiple saved views matched delete target';

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
export function isFilterEqual(a: Record<string, string | null>, b: Record<string, string | null>): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();

    if (aKeys.length !== bKeys.length) {
        return false;
    }

    return aKeys.every((key, i) => key === bKeys[i] && a[key] === b[key]);
}

/**
 * A view is active when all of its params are present in current search params.
 */
export function isViewSearchActive(currentSearch: string, viewFilter: Record<string, string | null>): boolean {
    const currentParams = new URLSearchParams(currentSearch);
    const viewParams = filterRecordToSearchParams(viewFilter);

    for (const [key, value] of viewParams.entries()) {
        if (currentParams.get(key) !== value) {
            return false;
        }
    }

    return true;
}

/**
 * Parse shared views JSON from settings
 */
export function parseSharedViewsJSON(json: string): SharedViewsParseResult {
    try {
        const parsed: unknown = JSON.parse(json);

        if (!Array.isArray(parsed)) {
            return {ok: false, error: new Error('shared_views is not an array')};
        }

        const views = parsed.flatMap((item) => {
            const result = memberViewSchema.safeParse(item);
            return result.success ? [result.data] : [];
        });

        return {ok: true, views};
    } catch {
        return {ok: false, error: new Error('shared_views JSON parse failed')};
    }
}

function normalizeViewName(name: string): string {
    return name.trim().toLowerCase();
}

function findMatchingViewIndexes(views: MemberView[], target: MemberView): number[] {
    return views.flatMap((view, index) => {
        if (view.route !== target.route) {
            return [];
        }

        if (normalizeViewName(view.name) !== normalizeViewName(target.name)) {
            return [];
        }

        if (!isFilterEqual(view.filter, target.filter)) {
            return [];
        }

        return [index];
    });
}

export function buildViewsForSave(allViews: MemberView[], name: string, filters: Filter[], originalView?: MemberView): MemberView[] {
    const normalizedName = normalizeViewName(name);
    const trimmedName = name.trim();
    const filterRecord = filtersToRecord(filters);

    if (originalView) {
        const matchingIndexes = findMatchingViewIndexes(allViews, originalView);

        if (matchingIndexes.length === 0) {
            throw new Error(VIEW_UPDATE_NOT_FOUND_ERROR);
        }

        if (matchingIndexes.length > 1) {
            throw new Error(VIEW_UPDATE_AMBIGUOUS_ERROR);
        }

        const targetIndex = matchingIndexes[0];
        const duplicate = allViews.find((view, index) => {
            if (index === targetIndex || view.route !== 'members') {
                return false;
            }

            return normalizeViewName(view.name) === normalizedName;
        });

        if (duplicate) {
            throw new Error(VIEW_EXISTS_ERROR);
        }

        return allViews.map((view, index) => {
            if (index !== targetIndex) {
                return view;
            }

            return {
                ...view,
                name: trimmedName,
                filter: filterRecord
            };
        });
    }

    const duplicate = allViews.find(view => view.route === 'members' &&
        normalizeViewName(view.name) === normalizedName
    );

    if (duplicate) {
        throw new Error(VIEW_EXISTS_ERROR);
    }

    return [...allViews, {
        name: trimmedName,
        route: 'members',
        filter: filterRecord
    }];
}

export function buildViewsForDelete(allViews: MemberView[], view: MemberView): MemberView[] {
    const matchingIndexes = findMatchingViewIndexes(allViews, view);

    if (matchingIndexes.length === 0) {
        throw new Error(VIEW_DELETE_NOT_FOUND_ERROR);
    }

    if (matchingIndexes.length > 1) {
        throw new Error(VIEW_DELETE_AMBIGUOUS_ERROR);
    }

    const targetIndex = matchingIndexes[0];
    return allViews.filter((_, index) => index !== targetIndex);
}
