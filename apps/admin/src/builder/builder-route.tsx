import {lazy, Suspense, useEffect, useMemo, useRef, useState} from 'react';

import {Link, Navigate, useConfirmUnload, useSearchParams} from '@tryghost/admin-x-framework';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseCustomThemeSettings} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {isDefaultOrLegacyTheme, useActiveTheme} from '@tryghost/admin-x-framework/api/themes';
import {Button, LoadingIndicator} from '@tryghost/shade/components';
import {DirtyConfirmDialog} from '@tryghost/shade/patterns';
import {Box, Stack, Text} from '@tryghost/shade/primitives';
import {scrapeContentApiKey} from '@tryghost/theme-renderer/editor/instance-config';
import {useBlocker} from 'react-router';

import {BuilderShell} from '@/builder/builder-shell';
import {BuilderSession} from '@/builder/core/builder-session';
import {BrowserPiModelAccess} from '@/builder/models/browser-pi-model-access';
import {CURATED_MODELS} from '@/builder/models/curated-models';
import {loadThemeDraft} from '@/builder/workspaces/theme/theme-loader';
import {createThemeRendererClient} from '@/builder/workspaces/theme/preview/preview-bridge';
import {IframePreviewDocumentSurface} from '@/builder/workspaces/theme/preview/preview-document';
import {ThemePreviewAdapter} from '@/builder/workspaces/theme/preview/theme-preview-adapter';
import {ThemeWorkspace} from '@/builder/workspaces/theme/theme-workspace';

import type {BuilderSessionState} from '@/builder/core/builder-session';
import type {BuilderSelectionContext} from '@/builder/core/workspace';
import type {BuilderProvider} from '@/builder/models/curated-models';
import type {CustomThemeSetting} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import type {Setting} from '@tryghost/admin-x-framework/api/settings';
import type {Theme} from '@tryghost/admin-x-framework/api/themes';

const unavailableNotice = {
    settingsNotice: {
        message: 'Design Builder is not available on this site.',
        type: 'info'
    }
} as const;

const RuntimeProof = import.meta.env.DEV ? lazy(() => import('./runtime-proof')) : null;
const PreviewRuntimeProof = import.meta.env.DEV ? lazy(() => import('./workspaces/theme/preview/preview-runtime-proof')) : null;

const loadingState: BuilderSessionState = {
    status: 'loading',
    messages: [],
    workspace: {revision: '', dirty: false, validation: null}
};

function compatibleSettings(settings: Setting[]): Array<{key: string; value: string | boolean | null}> {
    return settings.flatMap(setting => typeof setting.value === 'string' || typeof setting.value === 'boolean' || setting.value === null ? [{key: setting.key, value: setting.value}] : []);
}

function providerDefaultModel(provider: BuilderProvider): string {
    const model = CURATED_MODELS.find(item => item.provider === provider);
    if (!model) {
        throw new Error(`No Builder model is configured for ${provider}.`);
    }
    return model.id;
}

async function fetchContentSettings(siteUrl: string, contentApiKey: string, signal: AbortSignal): Promise<Record<string, unknown>> {
    const url = new URL(`${siteUrl.replace(/\/$/, '')}/ghost/api/content/settings/`);
    url.searchParams.set('key', contentApiKey);
    const response = await fetch(url, {
        credentials: 'include',
        headers: {Accept: 'application/json'},
        signal
    });
    if (!response.ok) {
        throw new Error(`Failed to load the site settings used by the theme renderer (${response.status}).`);
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.hasOwn(body, 'settings')) {
        throw new Error('The site settings response used by the theme renderer was invalid.');
    }
    const payload = (body as {settings?: unknown}).settings;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('The site settings response used by the theme renderer was invalid.');
    }
    return payload as Record<string, unknown>;
}

async function loadActiveTheme({theme, settings, customSettings, siteUrl, preview, signal}: {
    theme: Theme;
    settings: Array<{key: string; value: string | boolean | null}>;
    customSettings: CustomThemeSetting[];
    siteUrl: string;
    preview: ThemePreviewAdapter;
    signal: AbortSignal;
}) {
    const {apiRoot} = getGhostPaths();
    const [archiveResponse, liveResponse] = await Promise.all([
        fetch(`${apiRoot}/themes/${encodeURIComponent(theme.name)}/download/`, {
            credentials: 'include',
            headers: {Accept: 'application/zip, application/octet-stream, */*'},
            signal
        }),
        fetch(`${siteUrl}?admin_toolbar=0`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'text/html',
                'Content-Type': 'text/html;charset=utf-8',
                'x-ghost-preview': new URLSearchParams({custom: '{}'}).toString()
            },
            signal
        })
    ]);
    if (!archiveResponse.ok) {
        throw new Error(`Failed to download the active theme (${archiveResponse.status}).`);
    }
    if (!liveResponse.ok) {
        throw new Error(`Failed to inspect the live site (${liveResponse.status}).`);
    }
    const [archive, liveHtml] = await Promise.all([archiveResponse.arrayBuffer(), liveResponse.text()]);
    const contentApiKey = scrapeContentApiKey(liveHtml);
    if (!contentApiKey) {
        throw new Error('The live site did not expose the Content API configuration needed by Builder.');
    }
    const contentSettings = await fetchContentSettings(siteUrl, contentApiKey, signal);
    const draft = await loadThemeDraft({
        archive,
        customSettings,
        settings,
        site: {contentApiKey, liveHtml, settingsPayload: contentSettings, url: siteUrl},
        theme: {builtIn: isDefaultOrLegacyTheme(theme), name: theme.name}
    }, signal);
    const validation = await preview.start(draft, signal);
    if (!validation.valid) {
        throw new Error('The active theme did not render a valid Builder preview.');
    }
    return preview.draft;
}

const ThemeBuilderExperience = ({theme, settings, customSettings, siteUrl}: {
    theme: Theme;
    settings: Array<{key: string; value: string | boolean | null}>;
    customSettings: CustomThemeSetting[];
    siteUrl: string;
}) => {
    const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
    const [session, setSession] = useState<BuilderSession | null>(null);
    const [state, setState] = useState<BuilderSessionState>(loadingState);
    const [selection, setSelection] = useState<BuilderSelectionContext | null>(null);
    const [provider, setProvider] = useState<BuilderProvider>('openai');
    const [modelId, setModelId] = useState(() => providerDefaultModel('openai'));
    const [, setCredentialVersion] = useState(0);
    const modelAccess = useMemo(() => new BrowserPiModelAccess(), []);
    const previewRef = useRef<ThemePreviewAdapter | null>(null);
    const leaveConfirmedRef = useRef(false);

    useEffect(() => {
        if (!iframe) {
            return;
        }
        const surface = new IframePreviewDocumentSurface(iframe);
        const preview = new ThemePreviewAdapter({rendererFactory: () => Promise.resolve(createThemeRendererClient()), surface});
        const workspace = new ThemeWorkspace({
            id: `theme:${theme.name}`,
            load: signal => loadActiveTheme({theme, settings, customSettings, siteUrl, preview, signal}),
            preview,
            title: theme.name
        });
        const nextSession = new BuilderSession({modelAccess, workspace});
        previewRef.current = preview;
        setSession(nextSession);
        const unsubscribeSession = nextSession.subscribe(setState);
        const unsubscribePreview = preview.subscribe(previewState => setSelection(previewState.selection));
        void nextSession.load().catch(() => {});

        return () => {
            unsubscribePreview();
            unsubscribeSession();
            nextSession.dispose();
            preview.destroy();
            previewRef.current = null;
        };
    }, [customSettings, iframe, modelAccess, settings, siteUrl, theme]);

    const shouldGuardNavigation = state.workspace.dirty || state.status === 'running' || state.status === 'publishing';
    useConfirmUnload(shouldGuardNavigation);
    const navigationBlocker = useBlocker(({currentLocation, nextLocation}) => shouldGuardNavigation && currentLocation.pathname !== nextLocation.pathname);
    const isNavigationBlocked = navigationBlocker.state === 'blocked';

    const selectModel = (nextProvider: BuilderProvider, nextModelId: string) => {
        modelAccess.selectModel(nextProvider, nextModelId);
        setProvider(nextProvider);
        setModelId(nextModelId);
    };

    return (
        <>
            <BuilderShell
                backLabel='Back to Design settings'
                backTo='/settings/design'
                hasCredential={modelAccess.hasApiKey(provider)}
                modelId={modelId}
                models={CURATED_MODELS}
                preview={<iframe ref={setIframe} className='size-full border-0 bg-background' title='Theme preview' />}
                provider={provider}
                selection={selection}
                state={state}
                title='Design Builder'
                onForgetApiKey={(targetProvider) => {
                    modelAccess.forgetApiKey(targetProvider);
                    setCredentialVersion(value => value + 1);
                }}
                onRemoveSelection={() => void previewRef.current?.clearSelection()}
                onRetry={() => void session?.retryLastTurn()}
                onRewind={messageId => void session?.rewind(messageId)}
                onSaveApiKey={(targetProvider, key) => {
                    modelAccess.setApiKey(targetProvider, key);
                    setCredentialVersion(value => value + 1);
                }}
                onSelectModel={selectModel}
                onStop={() => session?.stop()}
                onSubmit={value => session?.startTurn(value) ?? Promise.reject(new Error('The Builder session is not ready.'))}
            />
            <DirtyConfirmDialog
                open={isNavigationBlocked}
                onConfirm={() => {
                    leaveConfirmedRef.current = true;
                    navigationBlocker.proceed?.();
                }}
                onOpenChange={(open) => {
                    if (open) {
                        return;
                    }
                    if (leaveConfirmedRef.current) {
                        leaveConfirmedRef.current = false;
                    } else {
                        navigationBlocker.reset?.();
                    }
                }}
            />
        </>
    );
};

const ThemeBuilderRoute = () => {
    const activeTheme = useActiveTheme();
    const settings = useBrowseSettings();
    const customSettings = useBrowseCustomThemeSettings();
    const site = useBrowseSite();
    const isLoading = activeTheme.isLoading || settings.isLoading || customSettings.isLoading || site.isLoading;
    const theme = activeTheme.data?.themes[0];
    const themeSettings = useMemo(() => compatibleSettings(settings.data?.settings ?? []), [settings.data]);

    if (isLoading) {
        return (
            <Box className='fixed inset-0 z-50 bg-background' padding='lg'>
                <Stack align='center' className='size-full' gap='md' justify='center'>
                    <LoadingIndicator size='md' />
                    <Text as='h1' size='xl' weight='semibold'>Design Builder</Text>
                    <Text tone='secondary'>Loading the active theme…</Text>
                </Stack>
            </Box>
        );
    }

    if (activeTheme.isError || settings.isError || customSettings.isError || site.isError || !theme || !settings.data || !customSettings.data || !site.data) {
        return (
            <Box className='fixed inset-0 z-50 bg-background' padding='lg'>
                <Stack align='center' className='size-full text-center' gap='sm' justify='center'>
                    <Text as='h1' size='xl' weight='semibold'>Design Builder</Text>
                    <Text tone='secondary'>Builder could not load the active theme. Return to Design settings and try again.</Text>
                    <Button variant='outline' asChild>
                        <Link to='/settings/design'>Back to Design settings</Link>
                    </Button>
                </Stack>
            </Box>
        );
    }

    return (
        <ThemeBuilderExperience
            customSettings={customSettings.data.custom_theme_settings}
            settings={themeSettings}
            siteUrl={site.data.site.url}
            theme={theme}
        />
    );
};

const BuilderRoute = () => {
    const [searchParams] = useSearchParams();
    const {data, isError, isLoading} = useBrowseConfig();
    const isUnavailable = isError || (!isLoading && data?.config.labs?.designBuilder !== true);

    if (isLoading) {
        return null;
    }

    if (isUnavailable) {
        return <Navigate state={unavailableNotice} to='/settings/design' replace />;
    }

    if (RuntimeProof && searchParams.get('proof') === 'pi') {
        return <Suspense fallback={null}><RuntimeProof /></Suspense>;
    }

    if (PreviewRuntimeProof && searchParams.get('proof') === 'preview') {
        return <Suspense fallback={null}><PreviewRuntimeProof /></Suspense>;
    }

    return <Box className='size-full' data-model-runtime={BrowserPiModelAccess.runtime}><ThemeBuilderRoute /></Box>;
};

export default BuilderRoute;
