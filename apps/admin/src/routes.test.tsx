import {describe, expect, it, vi} from 'vitest';

vi.mock('@tryghost/admin-x-framework', () => ({
    Outlet: () => null,
    lazyComponent: (loader: unknown) => loader,
    redirect: (to: string) => ({to})
}));

vi.mock('@tryghost/activitypub/src/index', () => ({
    FeatureFlagsProvider: () => null,
    routes: []
}));

vi.mock('@tryghost/posts/src/providers/posts-app-context', () => ({
    default: ({children}: {children: React.ReactNode}) => children
}));

vi.mock('@tryghost/posts/src/routes', () => ({
    routes: [{
        children: []
    }]
}));

vi.mock('@tryghost/stats/src/providers/global-data-provider', () => ({
    default: ({children}: {children: React.ReactNode}) => children
}));

vi.mock('@tryghost/stats/src/routes', () => ({
    routes: []
}));

vi.mock('./my-profile-redirect', () => ({
    default: () => null
}));

vi.mock('./ember-bridge', () => ({
    EmberFallback: () => null,
    ForceUpgradeGuard: () => null
}));

vi.mock('./members-route', () => ({
    MembersRoute: () => null
}));

vi.mock('./not-found', () => ({
    NotFound: () => null
}));

import {routes} from './routes';

type RouteNode = {
    path?: string;
    children?: RouteNode[];
};

function collectPaths(routeObjects: RouteNode[]): string[] {
    return routeObjects.flatMap((route): string[] => {
        const paths = route.path ? [route.path] : [];

        if (!route.children) {
            return paths;
        }

        return [...paths, ...collectPaths(route.children)];
    });
}

describe('admin routes', () => {
    it('does not register the removed members-forward route', () => {
        expect(collectPaths(routes)).not.toContain('/members-forward');
    });
});
