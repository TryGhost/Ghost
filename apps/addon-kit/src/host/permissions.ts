import type {AddonManifest, AddonTarget} from '../types.ts';

/**
 * The permission screen derives its list from what the manifest already
 * implies — surfaces, backend origin, and the (spike-only) blanket Admin API
 * passthrough every add-on gets. Display-only: nothing is enforced per-grant;
 * the permissions revamp owns real scoping.
 */

export interface DerivedPermission {
    key: string;
    label: string;
}

interface PermissionSource {
    handle: string;
    backend?: string;
    sidebar?: AddonManifest['sidebar'];
    targeting: Array<{target: AddonTarget}>;
}

export function derivePermissions(source: PermissionSource): DerivedPermission[] {
    const targets = new Set(source.targeting.map(entry => entry.target));
    const permissions: DerivedPermission[] = [];

    if (targets.has('admin.dashboard.card.render')) {
        permissions.push({key: 'dashboard-card', label: 'Add a card to your Analytics overview'});
    }
    if (targets.has('admin.page.render')) {
        permissions.push({key: 'page', label: `Add a page to your admin at /apps/${source.handle}`});
    }
    if (source.sidebar) {
        permissions.push({key: 'sidebar', label: `Add "${source.sidebar.label}" to your admin sidebar`});
    }
    permissions.push({key: 'admin-api', label: 'Read and write your site data through the Admin API'});
    if (source.backend) {
        let origin = source.backend;
        try {
            origin = new URL(source.backend).host;
        } catch {
            // Keep the raw value if it isn't a parseable URL.
        }
        permissions.push({key: 'backend', label: `Send data to ${origin}`});
    }

    return permissions;
}
