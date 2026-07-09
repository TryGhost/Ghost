import {useState} from 'react';
import {useNavigate, useParams} from '@tryghost/admin-x-framework';
import {toast} from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    LoadingIndicator,
    Separator
} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useMarketplaceCatalog} from './catalog.ts';
import {lucideFromManifest} from './icon.ts';
import {removeDevManifestUrl, useAddonActions, useAddonInstalls} from './installs.ts';
import {AddonPageChrome} from './page-chrome.tsx';
import {derivePermissions} from './permissions.ts';
import type {AddonInstallRecord, AddonManifest, AddonTarget} from '../types.ts';

const PAGE_TARGET = 'admin.page.render';

interface DetailSource {
    name: string;
    handle: string;
    version: string;
    publisher?: string;
    description?: string;
    backend?: string;
    manifestUrl: string;
    sidebar?: AddonManifest['sidebar'];
    targeting: Array<{target: AddonTarget}>;
    install?: AddonInstallRecord;
}

function detailFromInstall(install: AddonInstallRecord): DetailSource {
    return {...install, install};
}

function detailFromManifest(manifest: AddonManifest, manifestUrl: string): DetailSource {
    return {
        name: manifest.name,
        handle: manifest.handle,
        version: manifest.version,
        publisher: manifest.publisher,
        description: manifest.description,
        backend: manifest.backend,
        manifestUrl,
        sidebar: manifest.sidebar,
        targeting: manifest.targeting
    };
}

function UninstallButton({install, onUninstalled}: {install: AddonInstallRecord; onUninstalled: () => void}) {
    const {uninstall} = useAddonActions();
    const [busy, setBusy] = useState(false);

    const confirm = async () => {
        setBusy(true);
        try {
            await uninstall(install.handle);
            toast.success(`Uninstalled ${install.name}`);
            onUninstalled();
        } catch (error) {
            toast.error(`Uninstall failed: ${String(error)}`);
            setBusy(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button disabled={busy} variant="destructive">Uninstall</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Uninstall {install.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Its card, page, and sidebar entry are removed immediately. Data the
                        add-on keeps on its own backend is not touched.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirm}>Uninstall</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function DetailActions({detail}: {detail: DetailSource}) {
    const navigate = useNavigate();
    const install = detail.install;
    const hasPage = detail.targeting.some(entry => entry.target === PAGE_TARGET);

    if (!install) {
        return (
            <Button onClick={() => navigate(`/apps/install?manifest=${encodeURIComponent(detail.manifestUrl)}`)}>
                Install
            </Button>
        );
    }

    return (
        <>
            {hasPage && <Button variant="outline" onClick={() => navigate(`/apps/${detail.handle}`)}>Open</Button>}
            {install.dev ? (
                <Button
                    variant="destructive"
                    onClick={() => {
                        removeDevManifestUrl(install.manifestUrl);
                        toast.success(`Removed dev manifest for ${install.name}`);
                        navigate('/apps');
                    }}
                >
                    Remove dev manifest
                </Button>
            ) : (
                <UninstallButton install={install} onUninstalled={() => navigate('/apps')} />
            )}
        </>
    );
}

/**
 * Unified, state-aware detail page at #/apps/marketplace/:handle — the
 * marketplace listing and the manage screen collapsed into one. Resolves the
 * handle against installed records first (settings + dev), then the catalog.
 * Install always routes through the consent screen.
 */
export function AddonDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const {installs, isLoading: installsLoading} = useAddonInstalls();
    const {items, isLoading: catalogLoading} = useMarketplaceCatalog();

    if (installsLoading || catalogLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingIndicator size="md" />
            </div>
        );
    }

    const install = installs.find(candidate => candidate.handle === params.handle);
    const catalogItem = items.find(item => item.manifest?.handle === params.handle);
    const detail = install
        ? detailFromInstall(install)
        : (catalogItem?.manifest ? detailFromManifest(catalogItem.manifest, catalogItem.manifestUrl) : null);

    if (!detail) {
        return (
            <AddonPageChrome title="Add-on not found">
                <Text as="p" tone="secondary">No installed or listed add-on matches this address.</Text>
                <div className="mt-4">
                    <Button variant="outline" onClick={() => navigate('/apps/marketplace')}>Back to marketplace</Button>
                </div>
            </AddonPageChrome>
        );
    }

    const Icon = lucideFromManifest(detail.sidebar?.icon);
    const permissions = derivePermissions(detail);
    const origin = new URL(detail.manifestUrl).host;

    return (
        <AddonPageChrome
            actions={<DetailActions detail={detail} />}
            description={detail.publisher ?? origin}
            title={(
                <span className="inline-flex items-center gap-2">
                    {detail.name}
                    {install && !install.dev && <Badge variant="success">Installed</Badge>}
                    {install?.dev && <Badge variant="outline">Dev</Badge>}
                </span>
            )}
        >
            <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                <Card>
                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                            <Icon className="text-muted-foreground" size={24} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <CardTitle>About</CardTitle>
                            <Text size="sm" tone="secondary">{detail.description ?? 'No description provided.'}</Text>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Separator className="mb-4" />
                        <Stack gap="sm">
                            <Inline gap="sm" justify="between">
                                <Text size="sm" tone="secondary">Version</Text>
                                <Text size="sm">v{detail.version}</Text>
                            </Inline>
                            <Inline gap="sm" justify="between">
                                <Text size="sm" tone="secondary">Provider</Text>
                                <Text size="sm">{origin}</Text>
                            </Inline>
                            {detail.backend && (
                                <Inline gap="sm" justify="between">
                                    <Text size="sm" tone="secondary">Backend</Text>
                                    <Text size="sm">{detail.backend}</Text>
                                </Inline>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>This add-on can</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Stack gap="sm">
                            {permissions.map(permission => (
                                <Inline key={permission.key} className="items-start!" gap="sm">
                                    <LucideIcon.Check className="mt-0.5 shrink-0 text-muted-foreground" size={16} />
                                    <Text size="sm">{permission.label}</Text>
                                </Inline>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </div>
        </AddonPageChrome>
    );
}
