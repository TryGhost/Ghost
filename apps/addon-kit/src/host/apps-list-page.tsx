import {useNavigate} from '@tryghost/admin-x-framework';
import {Badge, Button, Card, CardContent, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {lucideFromManifest} from './icon.ts';
import {useAddonInstalls} from './installs.ts';
import {AddonPageChrome} from './page-chrome.tsx';
import type {AddonInstallRecord} from '../types.ts';

function AddonRow({install}: {install: AddonInstallRecord}) {
    const navigate = useNavigate();
    const Icon = lucideFromManifest(install.sidebar?.icon);

    return (
        <button
            className="flex w-full items-center gap-4 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/60"
            type="button"
            onClick={() => navigate(`/apps/marketplace/${install.handle}`)}
        >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <Icon className="text-muted-foreground" size={20} />
            </div>
            <Stack className="min-w-0 grow" gap="none">
                <span className="flex items-center gap-2">
                    <Text weight="semibold">{install.name}</Text>
                    {install.dev && <Badge variant="outline">Dev</Badge>}
                </span>
                <Text size="sm" tone="secondary">
                    {install.publisher ?? new URL(install.manifestUrl).host} · v{install.version}
                </Text>
            </Stack>
            <LucideIcon.ChevronRight className="shrink-0 text-muted-foreground" size={16} />
        </button>
    );
}

/**
 * The installed-apps list at #/apps: every add-on actually running — settings
 * records plus dev-manifest loads (badged) — linking into the unified detail
 * page. The marketplace is one click behind the header action.
 */
export function AddonsListPage() {
    const navigate = useNavigate();
    const {installs, isLoading} = useAddonInstalls();

    return (
        <AddonPageChrome
            actions={<Button onClick={() => navigate('/apps/marketplace')}>Browse marketplace</Button>}
            title="Apps"
        >
            {isLoading && <LoadingIndicator size="md" />}
            {!isLoading && installs.length === 0 && (
                <EmptyIndicator
                    actions={<Button onClick={() => navigate('/apps/marketplace')}>Browse marketplace</Button>}
                    className="grow"
                    description="Install add-ons to extend your admin with new cards, pages, and integrations."
                    title="No apps installed"
                >
                    <LucideIcon.Puzzle />
                </EmptyIndicator>
            )}
            {!isLoading && installs.length > 0 && (
                <Card>
                    <CardContent className="flex flex-col divide-y p-2">
                        {installs.map(install => <AddonRow key={install.handle} install={install} />)}
                    </CardContent>
                </Card>
            )}
        </AddonPageChrome>
    );
}
