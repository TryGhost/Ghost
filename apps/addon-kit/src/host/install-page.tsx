import {useEffect, useState} from 'react';
import {Navigate, useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, LoadingIndicator, Separator} from '@tryghost/shade/components';
import {Inline, Stack, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {lucideFromManifest} from './icon.ts';
import {ADDONS_SETTING_KEY, fetchManifest, parseInstallRecords, useAddonActions} from './installs.ts';
import {AddonPageChrome} from './page-chrome.tsx';
import {derivePermissions} from './permissions.ts';
import type {AddonManifest} from '../types.ts';

const PAGE_TARGET = 'admin.page.render';

type InstallState =
    | {status: 'loading'}
    | {status: 'invalid'; message: string}
    | {status: 'consent'; manifest: AddonManifest};

/**
 * The consent screen at #/apps/install?manifest=<url> — the link every
 * install goes through, whether it came from the marketplace, the detail
 * page, or anywhere on the web. The manifest origin is the trust anchor and
 * is displayed prominently; permissions are derived from the manifest
 * (display-only, spike). Already-installed handles redirect to the detail
 * page: no consent screen for something already consented to.
 */
export function AddonInstallPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const {install} = useAddonActions();
    const {data: settingsData} = useBrowseSettings();
    const [state, setState] = useState<InstallState>({status: 'loading'});
    const [busy, setBusy] = useState(false);

    const manifestUrl = searchParams.get('manifest');

    useEffect(() => {
        if (!manifestUrl) {
            setState({status: 'invalid', message: 'This install link is missing its manifest URL.'});
            return;
        }

        let cancelled = false;
        setState({status: 'loading'});

        fetchManifest(manifestUrl)
            .then((manifest) => {
                if (!cancelled) {
                    setState({status: 'consent', manifest});
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setState({status: 'invalid', message: String(error)});
                }
            });

        return () => {
            cancelled = true;
        };
    }, [manifestUrl]);

    if (state.status === 'loading' || !settingsData) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingIndicator size="md" />
            </div>
        );
    }

    if (state.status === 'invalid') {
        return (
            <AddonPageChrome title="Can't install add-on">
                <Text as="p" tone="secondary">{state.message}</Text>
                <div className="mt-4">
                    <Button variant="outline" onClick={() => navigate('/apps/marketplace')}>Back to marketplace</Button>
                </div>
            </AddonPageChrome>
        );
    }

    const {manifest} = state;

    // Settings-backed records only: a dev override doesn't count as consent.
    // Skipped mid-accept — the settings write would re-render this into a
    // detail redirect racing accept()'s own post-install navigation.
    const records = parseInstallRecords(getSettingValue<string>(settingsData.settings, ADDONS_SETTING_KEY) ?? '[]');
    if (!busy && records.some(record => record.handle === manifest.handle)) {
        return <Navigate to={`/apps/marketplace/${manifest.handle}`} replace />;
    }

    const Icon = lucideFromManifest(manifest.sidebar?.icon);
    const permissions = derivePermissions(manifest);
    const origin = new URL(manifestUrl!).host;
    const hasPage = manifest.targeting.some(entry => entry.target === PAGE_TARGET);

    const accept = async () => {
        setBusy(true);
        try {
            const record = await install(manifestUrl!);
            toast.success(`Installed ${record.name}`);
            navigate(hasPage ? `/apps/${record.handle}` : '/apps', {replace: true});
        } catch (error) {
            toast.error(`Install failed: ${String(error)}`);
            setBusy(false);
        }
    };

    return (
        <AddonPageChrome title="Install add-on">
            <div className="flex grow items-start justify-center pt-8">
                <Card className="w-full max-w-lg">
                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                            <Icon className="text-muted-foreground" size={24} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <CardTitle className="flex items-center gap-2">
                                {manifest.name}
                                <Badge variant="outline">v{manifest.version}</Badge>
                            </CardTitle>
                            <Text size="sm" tone="secondary">
                                {manifest.publisher ?? 'Unknown publisher'} · from <span className="font-medium">{origin}</span>
                            </Text>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {manifest.description && (
                            <Text as="p" className="mb-4" size="sm" tone="secondary">{manifest.description}</Text>
                        )}
                        <Separator className="mb-4" />
                        <Stack gap="sm">
                            <Text size="sm" weight="semibold">This add-on will be able to:</Text>
                            {permissions.map(permission => (
                                <Inline key={permission.key} className="items-start!" gap="sm">
                                    <LucideIcon.Check className="mt-0.5 shrink-0 text-muted-foreground" size={16} />
                                    <Text size="sm">{permission.label}</Text>
                                </Inline>
                            ))}
                        </Stack>
                        <Separator className="my-4" />
                        <Text as="p" size="sm" tone="secondary">
                            Only install add-ons from providers you trust. Ghost verifies the
                            code it downloads against this release, but the provider controls
                            what future releases do.
                        </Text>
                        <Inline className="mt-6" gap="sm" justify="end">
                            <Button disabled={busy} variant="outline" onClick={() => navigate('/apps/marketplace')}>
                                Cancel
                            </Button>
                            <Button disabled={busy} onClick={accept}>
                                {busy ? 'Installing…' : 'Install'}
                            </Button>
                        </Inline>
                    </CardContent>
                </Card>
            </div>
        </AddonPageChrome>
    );
}
