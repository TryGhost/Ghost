import {RemoteRootRenderer} from '@remote-dom/react/host';
import {useParams} from '@tryghost/admin-x-framework';
import {LoadingIndicator} from '@tryghost/shade/components';
import {Text} from '@tryghost/shade/primitives';
import {GH_COMPONENT_MAP} from './component-map.tsx';
import {AddonErrorBoundary} from './error-boundary.tsx';
import {useAddonInstalls} from './installs.ts';
import {AddonPageChrome} from './page-chrome.tsx';
import {useAddonSurface} from './use-addon-surface.ts';
import type {AddonInstallRecord} from '../types.ts';

const PAGE_TARGET = 'admin.page.render';

const FAILED_FALLBACK = <Text as="p">This add-on failed to load.</Text>;

interface AddonPageSurfaceProps {
    install: AddonInstallRecord;
    path: string;
}

function AddonPageSurface({install, path}: AddonPageSurfaceProps) {
    const {receiver, status, error} = useAddonSurface({install, target: PAGE_TARGET, context: {path}});

    return (
        <AddonPageChrome description="Add-on" title={install.name}>
            {status === 'error' && FAILED_FALLBACK}
            {(status === 'loading' || status === 'hidden') && <LoadingIndicator size="md" />}
            {status === 'ready' && !error && (
                <AddonErrorBoundary fallback={FAILED_FALLBACK}>
                    <RemoteRootRenderer components={GH_COMPONENT_MAP} receiver={receiver} />
                </AddonErrorBoundary>
            )}
        </AddonPageChrome>
    );
}

/**
 * Route component for `#/apps/:handle/*`. The host owns the URL bar: the
 * wildcard remainder is passed to the add-on as `ghost.data.context.path`,
 * and the add-on navigates via `ghost.navigate`.
 */
export function AddonPage() {
    const params = useParams();
    const handle = params.handle;
    const path = `/${params['*'] ?? ''}`;
    const {installs, isLoading} = useAddonInstalls();

    const install = installs.find(candidate => candidate.handle === handle && candidate.enabled);
    const hasPage = install?.targeting.some(entry => entry.target === PAGE_TARGET);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingIndicator size="md" />
            </div>
        );
    }

    if (!install || !hasPage) {
        return (
            <AddonPageChrome title="Add-on not found">
                <Text as="p" tone="secondary">No installed add-on provides a page at this address.</Text>
            </AddonPageChrome>
        );
    }

    return <AddonPageSurface install={install} path={path} />;
}
