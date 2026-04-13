import {z} from 'zod';

// TODO: Consolidate shared view parsing once the admin and posts apps are merged.
export const sharedViewSchema = z.object({
    name: z.string(),
    route: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    filter: z.record(z.string(), z.string().nullable())
});

export type SharedView = z.infer<typeof sharedViewSchema>;
type SharedViewIdentity = Pick<SharedView, 'route' | 'filter'>;
type SharedViewName = Pick<SharedView, 'route' | 'name'>;

export type AllSharedViewsParseResult =
    | {ok: true; views: SharedView[]}
    | {ok: false; error: Error};

export function normalizeSharedViewName(name: string): string {
    return name.trim().toLowerCase();
}

export function isSharedViewFilterEqual(filterA: Record<string, string | null>, filterB: Record<string, string | null>): boolean {
    const keysA = Object.keys(filterA);
    const keysB = Object.keys(filterB);

    if (keysA.length !== keysB.length) {
        return false;
    }

    return keysA.every(key => filterA[key] === filterB[key]);
}

export function isSharedViewEqual(viewA: SharedViewIdentity, viewB: SharedViewIdentity): boolean {
    return viewA.route === viewB.route && isSharedViewFilterEqual(viewA.filter, viewB.filter);
}

export function findMatchingSharedViewIndexes(views: SharedView[], target: SharedViewIdentity): number[] {
    return views.flatMap((view, index) => (isSharedViewEqual(view, target) ? [index] : []));
}

export function hasSharedViewNameConflict(views: SharedView[], target: SharedViewName, excludedIndex?: number): boolean {
    const normalizedName = normalizeSharedViewName(target.name);

    return views.some((view, index) => {
        return index !== excludedIndex &&
            view.route === target.route &&
            normalizeSharedViewName(view.name) === normalizedName;
    });
}

export function parseAllSharedViewsJSON(json: string): AllSharedViewsParseResult {
    try {
        const parsed: unknown = JSON.parse(json);

        if (!Array.isArray(parsed)) {
            // eslint-disable-next-line no-console
            console.error('Failed to parse shared_views setting:', new Error('shared_views is not an array'));
            return {ok: true, views: []};
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
