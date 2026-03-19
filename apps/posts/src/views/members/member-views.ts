import {z} from 'zod';

export const sharedViewSchema = z.object({
    name: z.string(),
    route: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    filter: z.record(z.string(), z.string().nullable())
});

export const memberViewSchema = sharedViewSchema.refine((view) => {
    return view.route === 'members' && typeof view.filter.filter === 'string' && view.filter.filter.length > 0;
});

export type SharedView = z.infer<typeof sharedViewSchema>;
export interface MemberView extends Omit<SharedView, 'route' | 'filter'> {
    route: 'members';
    filter: Record<string, string | null> & {
        filter: string;
    };
}

export type SharedViewsParseResult =
    | {ok: true; views: MemberView[]}
    | {ok: false; error: Error};

export type AllSharedViewsParseResult =
    | {ok: true; views: SharedView[]}
    | {ok: false; error: Error};

const VIEW_EXISTS_ERROR = 'A view with this name already exists';
const VIEW_UPDATE_NOT_FOUND_ERROR = 'Saved view could not be found for update';
const VIEW_UPDATE_AMBIGUOUS_ERROR = 'Multiple saved views matched update target';
const VIEW_DELETE_NOT_FOUND_ERROR = 'Saved view could not be found for delete';
const VIEW_DELETE_AMBIGUOUS_ERROR = 'Multiple saved views matched delete target';

function normalizeViewName(name: string): string {
    return name.trim().toLowerCase();
}

function getViewFilterValue(view: SharedView): string | null {
    return typeof view.filter.filter === 'string' && view.filter.filter
        ? view.filter.filter
        : null;
}

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

export function parseAllSharedViewsJSON(json: string): AllSharedViewsParseResult {
    try {
        const parsed: unknown = JSON.parse(json);

        if (!Array.isArray(parsed)) {
            return {ok: false, error: new Error('shared_views is not an array')};
        }

        const views = parsed.flatMap((item) => {
            const result = sharedViewSchema.safeParse(item);
            return result.success ? [result.data] : [];
        });

        return {ok: true, views};
    } catch {
        return {ok: false, error: new Error('shared_views JSON parse failed')};
    }
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

function findMatchingViewIndexes(views: SharedView[], target: MemberView): number[] {
    return views.flatMap((view, index) => {
        if (view.route !== target.route) {
            return [];
        }

        if (normalizeViewName(view.name) !== normalizeViewName(target.name)) {
            return [];
        }

        if (getViewFilterValue(view) !== target.filter.filter) {
            return [];
        }

        return [index];
    });
}

export function buildViewsForSave(allViews: SharedView[], name: string, filter: string, originalView?: MemberView): SharedView[] {
    const normalizedName = normalizeViewName(name);
    const nextView = buildMemberView(name, filter);

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
            return index !== targetIndex &&
                view.route === 'members' &&
                normalizeViewName(view.name) === normalizedName;
        });

        if (duplicate) {
            throw new Error(VIEW_EXISTS_ERROR);
        }

        return allViews.map((view, index) => {
            return index === targetIndex ? nextView : view;
        });
    }

    const duplicate = allViews.find((view) => {
        return view.route === 'members' &&
            normalizeViewName(view.name) === normalizedName;
    });

    if (duplicate) {
        throw new Error(VIEW_EXISTS_ERROR);
    }

    return [...allViews, nextView];
}

export function buildViewsForDelete(allViews: SharedView[], view: MemberView): SharedView[] {
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
