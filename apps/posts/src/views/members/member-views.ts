import {
    type SharedView,
    findMatchingSharedViewIndexes,
    hasSharedViewNameConflict,
    parseAllSharedViewsJSON,
    sharedViewSchema
} from './shared-views';
import {z} from 'zod';

const memberViewSchema = sharedViewSchema.extend({
    route: z.literal('members'),
    filter: z.record(z.string(), z.string().nullable()).refine((filter) => {
        return typeof filter.filter === 'string' && filter.filter.length > 0;
    })
});

export interface MemberView extends Omit<SharedView, 'route' | 'filter'> {
    route: 'members';
    filter: Record<string, string | null> & {
        filter: string;
    };
}

export type SharedViewsParseResult =
    | {ok: true; views: MemberView[]}
    | {ok: false; error: Error};

const VIEW_EXISTS_ERROR = 'A view with this name already exists';
const VIEW_UPDATE_NOT_FOUND_ERROR = 'Saved view could not be found for update';
const VIEW_UPDATE_AMBIGUOUS_ERROR = 'Multiple saved views matched update target';
const VIEW_DELETE_NOT_FOUND_ERROR = 'Saved view could not be found for delete';
const VIEW_DELETE_AMBIGUOUS_ERROR = 'Multiple saved views matched delete target';

function isMemberView(view: SharedView): view is MemberView {
    return memberViewSchema.safeParse(view).success;
}

export function filterRecordToSearchParams(filter: Record<string, string | null>): URLSearchParams {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filter)) {
        if (value !== null && value !== undefined && value !== '') {
            params.set(key, value);
        }
    }

    return params;
}

export function parseSharedViewsJSON(json: string): SharedViewsParseResult {
    const parsed = parseAllSharedViewsJSON(json);

    if (!parsed.ok) {
        return parsed;
    }

    return {
        ok: true,
        views: parsed.views.filter(isMemberView)
    };
}

export function isMemberViewSearchActive(currentSearch: string, view: MemberView): boolean {
    return new URLSearchParams(currentSearch).get('filter') === view.filter.filter;
}

function buildMemberView(name: string, filter: string): MemberView {
    return {
        name: name.trim(),
        route: 'members',
        filter: {filter}
    };
}

export function buildViewsForSave(allViews: SharedView[], name: string, filter: string, originalView?: MemberView): SharedView[] {
    const nextView = buildMemberView(name, filter);

    if (originalView) {
        const matchingIndexes = findMatchingSharedViewIndexes(allViews, originalView);

        if (matchingIndexes.length === 0) {
            throw new Error(VIEW_UPDATE_NOT_FOUND_ERROR);
        }

        if (matchingIndexes.length > 1) {
            throw new Error(VIEW_UPDATE_AMBIGUOUS_ERROR);
        }

        const targetIndex = matchingIndexes[0];
        if (hasSharedViewNameConflict(allViews, nextView, targetIndex)) {
            throw new Error(VIEW_EXISTS_ERROR);
        }

        return allViews.map((view, index) => {
            return index === targetIndex ? nextView : view;
        });
    }

    if (hasSharedViewNameConflict(allViews, nextView)) {
        throw new Error(VIEW_EXISTS_ERROR);
    }

    return [...allViews, nextView];
}

export function buildViewsForDelete(allViews: SharedView[], view: MemberView): SharedView[] {
    const matchingIndexes = findMatchingSharedViewIndexes(allViews, view);

    if (matchingIndexes.length === 0) {
        throw new Error(VIEW_DELETE_NOT_FOUND_ERROR);
    }

    if (matchingIndexes.length > 1) {
        throw new Error(VIEW_DELETE_AMBIGUOUS_ERROR);
    }

    const targetIndex = matchingIndexes[0];
    return allViews.filter((_, index) => index !== targetIndex);
}
