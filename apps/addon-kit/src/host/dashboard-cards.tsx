import {RemoteRootRenderer} from '@remote-dom/react/host';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton} from '@tryghost/shade/components';
import {Text} from '@tryghost/shade/primitives';
import {GH_COMPONENT_MAP} from './component-map.tsx';
import {AddonErrorBoundary} from './error-boundary.tsx';
import {useAddonInstalls} from './installs.ts';
import {useAddonSurface} from './use-addon-surface.ts';
import type {AddonInstallRecord} from '../types.ts';

const CARD_TARGET = 'admin.dashboard.card.render';

interface AddonDashboardCardProps {
    install: AddonInstallRecord;
    context: Record<string, unknown>;
}

const FAILED_FALLBACK = <Text as="p">This add-on failed to load.</Text>;

/**
 * The host-owned card shell: attribution, uniform chrome, loading state, and
 * an error boundary. The add-on remote-renders only the content inside.
 */
function AddonDashboardCard({install, context}: AddonDashboardCardProps) {
    const {receiver, status, error} = useAddonSurface({install, target: CARD_TARGET, context});

    if (status === 'hidden') {
        return null;
    }

    return (
        <Card className="group/card w-full">
            <CardHeader>
                <CardTitle className="flex items-baseline justify-between leading-snug font-medium text-muted-foreground">
                    {install.name}
                    <span className="text-xs tracking-wide text-muted-foreground/70 uppercase">Add-on</span>
                </CardTitle>
                <CardDescription className="hidden">Provided by the {install.name} add-on</CardDescription>
            </CardHeader>
            <CardContent>
                {status === 'error' && FAILED_FALLBACK}
                {status === 'loading' && (
                    <div className="flex flex-col gap-2">
                        <Skeleton className="w-2/3" />
                        <Skeleton className="w-1/3" />
                    </div>
                )}
                {status === 'ready' && !error && (
                    <AddonErrorBoundary fallback={FAILED_FALLBACK}>
                        <RemoteRootRenderer components={GH_COMPONENT_MAP} receiver={receiver} />
                    </AddonErrorBoundary>
                )}
            </CardContent>
        </Card>
    );
}

export interface AddonDashboardCardsProps {
    /** Target-specific context passed to every card, e.g. the current range. */
    context: Record<string, unknown>;
}

/**
 * The add-on card section for the analytics Overview page: one host-shelled
 * card per enabled install that fills the dashboard card target, appended
 * after the core cards in install order. Renders nothing when no add-on
 * fills the target — callers gate on the `addons` labs flag.
 */
export function AddonDashboardCards({context}: AddonDashboardCardsProps) {
    const {installs} = useAddonInstalls();

    const cardInstalls = installs.filter(install => install.enabled && install.targeting.some(entry => entry.target === CARD_TARGET));

    if (cardInstalls.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {cardInstalls.map(install => (
                <AddonDashboardCard key={install.handle} context={context} install={install} />
            ))}
        </div>
    );
}
