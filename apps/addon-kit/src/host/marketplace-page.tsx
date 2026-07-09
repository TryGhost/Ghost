import {useNavigate} from '@tryghost/admin-x-framework';
import {Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useMarketplaceCatalog} from './catalog.ts';
import {lucideFromManifest} from './icon.ts';
import {useAddonInstalls} from './installs.ts';
import {AddonPageChrome} from './page-chrome.tsx';
import type {AddonManifest} from '../types.ts';

function MarketplaceCard({manifest}: {manifest: AddonManifest}) {
    const navigate = useNavigate();
    const {installs} = useAddonInstalls();
    const installed = installs.some(install => install.handle === manifest.handle);
    const Icon = lucideFromManifest(manifest.sidebar?.icon);

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-start gap-4 space-y-0">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <Icon className="text-muted-foreground" size={24} />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle className="flex items-center gap-2">
                        {manifest.name}
                        {installed && <Badge variant="success">Installed</Badge>}
                    </CardTitle>
                    <CardDescription>{manifest.publisher ?? 'Unknown publisher'}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex grow flex-col justify-between gap-4">
                <Text size="sm" tone="secondary">{manifest.description ?? 'No description provided.'}</Text>
                <div>
                    <Button variant="outline" onClick={() => navigate(`/apps/marketplace/${manifest.handle}`)}>
                        View details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * The in-admin marketplace at #/apps/marketplace: a hardcoded catalog of
 * manifest URLs rendered from the manifests themselves (spike). Install goes
 * through the detail page and the consent screen — never directly from here.
 */
export function AddonMarketplacePage() {
    const {items, isLoading} = useMarketplaceCatalog();
    const available = items.filter(item => item.manifest);
    const failed = items.filter(item => item.error);

    return (
        <AddonPageChrome description="Browse and install add-ons for your site" title="Marketplace">
            {isLoading && <LoadingIndicator size="md" />}
            {!isLoading && available.length === 0 && (
                <EmptyIndicator
                    className="grow"
                    description="No add-ons could be loaded from the catalog. Is the demo provider server running on port 4650?"
                    title="Marketplace unavailable"
                >
                    <LucideIcon.Store />
                </EmptyIndicator>
            )}
            {!isLoading && available.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {available.map(item => <MarketplaceCard key={item.manifestUrl} manifest={item.manifest!} />)}
                </div>
            )}
            {!isLoading && failed.length > 0 && available.length > 0 && (
                <Text className="mt-4" size="sm" tone="secondary">
                    {failed.length} catalog {failed.length === 1 ? 'entry' : 'entries'} failed to load.
                </Text>
            )}
        </AddonPageChrome>
    );
}
