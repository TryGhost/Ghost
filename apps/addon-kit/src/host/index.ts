/**
 * Host-side runtime for Ghost add-ons: sandbox management, the remote-dom
 * host renderer with the gh-*→Shade map, the `ghost` bridge, and the
 * surface components admin apps embed. All surfaces are gated by callers on
 * the `addons` labs flag.
 */

export {AddonDashboardCards, type AddonDashboardCardsProps} from './dashboard-cards.tsx';
export {AddonPage} from './page.tsx';
export {AddonsListPage} from './apps-list-page.tsx';
export {AddonMarketplacePage} from './marketplace-page.tsx';
export {AddonDetailPage} from './addon-detail-page.tsx';
export {AddonInstallPage} from './install-page.tsx';
export {AddonSandboxController} from './sandbox-controller.ts';
export {AddonErrorBoundary} from './error-boundary.tsx';
export {GH_COMPONENT_MAP} from './component-map.tsx';
export {MARKETPLACE_CATALOG, useMarketplaceCatalog, type MarketplaceCatalogItem} from './catalog.ts';
export {derivePermissions, type DerivedPermission} from './permissions.ts';
export {lucideFromManifest} from './icon.ts';
export {useAddonSurface, type AddonSurfaceStatus, type UseAddonSurfaceOptions, type UseAddonSurfaceResult} from './use-addon-surface.ts';
export {useHostCapabilities} from './capabilities.ts';
export {
    ADDONS_SETTING_KEY,
    DEV_ADDONS_STORAGE_KEY,
    fetchManifest,
    isApiVersionCompatible,
    parseInstallRecords,
    pinManifest,
    removeDevManifestUrl,
    removeInstallRecord,
    upsertInstallRecord,
    useAddonActions,
    useAddonInstalls,
    type UseAddonActionsResult,
    type UseAddonInstallsResult
} from './installs.ts';
export {
    ADDON_API_VERSION,
    RENDER_TARGETS,
    SHOULD_RENDER_TARGETS,
    SHOULD_RENDER_PAIRS,
    type AddonDataEnvelope,
    type AddonInstallRecord,
    type AddonManifest,
    type AddonRenderTarget,
    type AddonTarget,
    type GhostBridge,
    type HostCapabilities
} from '../types.ts';
