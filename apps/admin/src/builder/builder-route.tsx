import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Link, Navigate, useConfirmUnload, useSearchParams } from '@tryghost/admin-x-framework';
import { getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseCustomThemeSettings } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import {
  isDefaultOrLegacyTheme,
  downloadThemeArchive,
  useActiveTheme,
  useBrowseThemes,
} from '@tryghost/admin-x-framework/api/themes';
import { getImageUrl, useUploadImage } from '@tryghost/admin-x-framework/api/images';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { scrapeContentApiKey } from '@tryghost/theme-renderer/editor/instance-config';
import { useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tryghost/admin-x-framework';

import { BuilderShell } from '@/builder/builder-shell';
import { BuilderSession } from '@/builder/core/builder-session';
import { BuilderAttachments } from '@/builder/core/attachments';
import { BrowserPiModelAccess } from '@/builder/models/browser-pi-model-access';
import { CURATED_MODELS } from '@/builder/models/curated-models';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';
import { createThemeRendererClient } from '@/builder/workspaces/theme/preview/preview-bridge';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { ThemePreviewAdapter } from '@/builder/workspaces/theme/preview/theme-preview-adapter';
import { PublishThemeDialog } from '@/builder/workspaces/theme/publish/publish-theme-dialog';
import {
  createAdminThemePublishTransport,
  ThemePublisher,
} from '@/builder/workspaces/theme/publish/publish-theme';
import { ThemeWorkspace } from '@/builder/workspaces/theme/theme-workspace';

import type { BuilderSessionState } from '@/builder/core/builder-session';
import type { BuilderAttachmentSummary } from '@/builder/core/attachments';
import type { PreviewInteractionMode } from '@/builder/components/preview-panel';
import type { BuilderSelectionContext } from '@/builder/core/workspace';
import type { BuilderProvider } from '@/builder/models/curated-models';
import type { CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import type { Theme } from '@tryghost/admin-x-framework/api/themes';
import type { ThemePublishState } from '@/builder/workspaces/theme/publish/publish-theme';

const unavailableNotice = {
  settingsNotice: {
    message: 'Design Builder is not available on this site.',
    type: 'info',
  },
} as const;

const RuntimeProof = import.meta.env.DEV ? lazy(() => import('./runtime-proof')) : null;
const PreviewRuntimeProof = import.meta.env.DEV
  ? lazy(() => import('./workspaces/theme/preview/preview-runtime-proof'))
  : null;
const RewindRuntimeProof = import.meta.env.DEV
  ? lazy(() => import('./rewind-runtime-proof'))
  : null;
const PublishRuntimeProof = import.meta.env.DEV
  ? lazy(() => import('./publish-runtime-proof'))
  : null;

const loadingState: BuilderSessionState = {
  status: 'loading',
  messages: [],
  workspace: { revision: '', dirty: false, validation: null },
};

type PreviewHistory = { entries: string[]; index: number };
const emptyPreviewHistory: PreviewHistory = { entries: [], index: -1 };

function compatibleSettings(
  settings: Setting[],
): Array<{ key: string; value: string | boolean | null }> {
  return settings.flatMap((setting) =>
    typeof setting.value === 'string' ||
    typeof setting.value === 'boolean' ||
    setting.value === null
      ? [{ key: setting.key, value: setting.value }]
      : [],
  );
}

async function fetchContentSettings(
  siteUrl: string,
  contentApiKey: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const url = new URL(`${siteUrl.replace(/\/$/, '')}/ghost/api/content/settings/`);
  url.searchParams.set('key', contentApiKey);
  // eslint-disable-next-line no-restricted-syntax -- Content API settings feed the front-end theme renderer.
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to load the site settings used by the theme renderer (${response.status}).`,
    );
  }
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !Object.hasOwn(body, 'settings')
  ) {
    throw new Error('The site settings response used by the theme renderer was invalid.');
  }
  const payload = (body as { settings?: unknown }).settings;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The site settings response used by the theme renderer was invalid.');
  }
  return payload as Record<string, unknown>;
}

async function loadActiveTheme({
  theme,
  settings,
  customSettings,
  siteUrl,
  preview,
  signal,
}: {
  theme: Theme;
  settings: Array<{ key: string; value: string | boolean | null }>;
  customSettings: CustomThemeSetting[];
  siteUrl: string;
  preview: ThemePreviewAdapter;
  signal: AbortSignal;
}) {
  const { apiRoot } = getGhostPaths();
  const [archiveResponse, liveResponse] = await Promise.all([
    downloadThemeArchive(apiRoot, theme.name, signal),
    // eslint-disable-next-line no-restricted-syntax -- The public site preview returns HTML, not Admin API data.
    fetch(`${siteUrl}?admin_toolbar=0`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        'Content-Type': 'text/html;charset=utf-8',
        'x-ghost-preview': new URLSearchParams({ custom: '{}' }).toString(),
      },
      signal,
    }),
  ]);
  if (!archiveResponse.ok) {
    throw new Error(`Failed to download the active theme (${archiveResponse.status}).`);
  }
  if (!liveResponse.ok) {
    throw new Error(`Failed to inspect the live site (${liveResponse.status}).`);
  }
  const [archive, liveHtml] = await Promise.all([
    archiveResponse.arrayBuffer(),
    liveResponse.text(),
  ]);
  const contentApiKey = scrapeContentApiKey(liveHtml);
  if (!contentApiKey) {
    throw new Error(
      'The live site did not expose the Content API configuration needed by Builder.',
    );
  }
  const contentSettings = await fetchContentSettings(siteUrl, contentApiKey, signal);
  const draft = await loadThemeDraft(
    {
      archive,
      customSettings,
      settings,
      site: { contentApiKey, liveHtml, settingsPayload: contentSettings, url: siteUrl },
      theme: { builtIn: isDefaultOrLegacyTheme(theme), name: theme.name },
    },
    signal,
  );
  const validation = await preview.start(draft, signal);
  if (!validation.valid) {
    throw new Error('The active theme did not render a valid Builder preview.');
  }
  return preview.draft;
}

const ThemeBuilderExperience = ({
  theme,
  settings,
  customSettings,
  installedThemeNames,
  siteUrl,
}: {
  theme: Theme;
  settings: Array<{ key: string; value: string | boolean | null }>;
  customSettings: CustomThemeSetting[];
  installedThemeNames: string[];
  siteUrl: string;
}) => {
  const modelAccess = useMemo(() => new BrowserPiModelAccess(), []);
  const initialModel = useMemo(() => modelAccess.selectedModel, [modelAccess]);
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [session, setSession] = useState<BuilderSession | null>(null);
  const [state, setState] = useState<BuilderSessionState>(loadingState);
  const [selection, setSelection] = useState<BuilderSelectionContext | null>(null);
  const [attachmentList, setAttachmentList] = useState<readonly BuilderAttachmentSummary[]>([]);
  const [provider, setProvider] = useState<BuilderProvider>(initialModel.provider);
  const [modelId, setModelId] = useState(initialModel.modelId);
  const [publishState, setPublishState] = useState<ThemePublishState>({
    status: 'idle',
    stage: 'idle',
  });
  const [previewMode, setPreviewMode] = useState<PreviewInteractionMode>('browse');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewHistory, setPreviewHistory] = useState<PreviewHistory>(emptyPreviewHistory);
  const [previewNavigationPending, setPreviewNavigationPending] = useState(false);
  const [inlineEditPending, setInlineEditPending] = useState(false);
  const [inlineEditAnnouncement, setInlineEditAnnouncement] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [publishTheme, setPublishTheme] = useState({
    name: theme.name,
    builtIn: isDefaultOrLegacyTheme(theme),
  });
  const [, setCredentialVersion] = useState(0);
  const { mutateAsync: uploadImage } = useUploadImage();
  const uploadImageRef = useRef(uploadImage);
  uploadImageRef.current = uploadImage;
  const attachments = useMemo(
    () =>
      new BuilderAttachments({
        uploadImage: async (file) => getImageUrl(await uploadImageRef.current({ file })),
      }),
    [],
  );
  const queryClient = useQueryClient();
  const previewRef = useRef<ThemePreviewAdapter | null>(null);
  const previewToggleSequenceRef = useRef(0);
  const previewNavigationPendingRef = useRef(false);
  const inlineAnnouncementSequenceRef = useRef(0);
  const previewEditingButtonRef = useRef<HTMLButtonElement>(null);
  const publisherRef = useRef<ThemePublisher | null>(null);
  const pendingCopyNameRef = useRef<string>();
  const serverMutationRef = useRef(false);
  const leaveConfirmedRef = useRef(false);

  useEffect(
    () => () => {
      if (serverMutationRef.current) {
        void queryClient.invalidateQueries({ queryKey: ['ThemesResponseType'] });
        void queryClient.invalidateQueries({ queryKey: ['SettingsResponseType'] });
        void queryClient.invalidateQueries({ queryKey: ['CustomThemeSettingsResponseType'] });
      }
    },
    [queryClient],
  );

  useEffect(() => attachments.subscribe(setAttachmentList), [attachments]);

  useEffect(() => {
    if (!iframe) {
      return;
    }
    previewToggleSequenceRef.current += 1;
    setPreviewMode('browse');
    setPreviewUrl('');
    setPreviewHistory(emptyPreviewHistory);
    setPreviewNavigationPending(false);
    previewNavigationPendingRef.current = false;
    setInlineEditPending(false);
    const surface = new IframePreviewDocumentSurface(iframe);
    let disposed = false;
    const workspaceRef: { current: ThemeWorkspace | null } = { current: null };
    const preview = new ThemePreviewAdapter({
      rendererFactory: () => Promise.resolve(createThemeRendererClient()),
      surface,
      onInlineEdit: async (edit, signal) => {
        if (!workspaceRef.current) {
          return { ok: false, message: 'The theme workspace is not ready.' };
        }
        setInlineEditPending(true);
        try {
          const result =
            edit.kind === 'text'
              ? await workspaceRef.current.applyInlineTextEdit(edit, signal)
              : await workspaceRef.current.applyInlineImageEdit(edit, signal);
          inlineAnnouncementSequenceRef.current += 1;
          setInlineEditAnnouncement({
            id: inlineAnnouncementSequenceRef.current,
            message: result.ok
              ? edit.kind === 'text'
                ? 'Preview text updated.'
                : 'Preview image updated.'
              : result.error.message,
          });
          requestAnimationFrame(() => previewEditingButtonRef.current?.focus());
          return result.ok ? { ok: true } : { ok: false, message: result.error.message };
        } finally {
          if (!disposed) {
            setInlineEditPending(false);
          }
        }
      },
    });
    let unsubscribePublisher = () => {};
    const workspace = new ThemeWorkspace({
      attachments,
      id: `theme:${theme.name}`,
      load: async (signal) => {
        const draft = await loadActiveTheme({
          theme,
          settings,
          customSettings,
          siteUrl,
          preview,
          signal,
        });
        const publisher = new ThemePublisher({
          baseline: draft,
          installedThemeNames,
          onServerMutation: () => {
            serverMutationRef.current = true;
          },
          transport: createAdminThemePublishTransport(getGhostPaths().apiRoot),
        });
        publisherRef.current = publisher;
        unsubscribePublisher = publisher.subscribe(setPublishState);
        return draft;
      },
      preview,
      publish: (draft, signal) => {
        if (!publisherRef.current) {
          throw new Error('Theme publishing is not ready yet.');
        }
        return publisherRef.current.publish(
          draft,
          { copyName: pendingCopyNameRef.current },
          signal,
        );
      },
      title: theme.name,
    });
    workspaceRef.current = workspace;
    const nextSession = new BuilderSession({ modelAccess, workspace });
    previewRef.current = preview;
    setSession(nextSession);
    const unsubscribeSession = nextSession.subscribe(setState);
    const unsubscribePreview = preview.subscribe((previewState) => {
      setSelection(previewState.selection);
      setPreviewUrl(previewState.url);
      if (!previewState.url || previewNavigationPendingRef.current) {
        return;
      }
      setPreviewHistory((current) => {
        if (current.entries[current.index] === previewState.url) {
          return current;
        }
        const entries = [...current.entries.slice(0, current.index + 1), previewState.url];
        return { entries, index: entries.length - 1 };
      });
    });
    void nextSession.load().catch(() => {});

    return () => {
      disposed = true;
      unsubscribePublisher();
      unsubscribePreview();
      unsubscribeSession();
      nextSession.dispose();
      preview.destroy();
      previewRef.current = null;
      publisherRef.current = null;
    };
  }, [
    attachments,
    customSettings,
    iframe,
    installedThemeNames,
    modelAccess,
    settings,
    siteUrl,
    theme,
  ]);

  useEffect(() => {
    if (previewMode !== 'browse' && !['ready', 'interrupted'].includes(state.status)) {
      previewToggleSequenceRef.current += 1;
      setPreviewMode('browse');
      const preview = previewRef.current;
      if (preview) {
        void preview.setInteractionMode('browse', new AbortController().signal).catch(() => {});
      }
    }
  }, [previewMode, state.status]);

  const shouldGuardNavigation =
    state.workspace.dirty || state.status === 'running' || state.status === 'publishing';
  useConfirmUnload(shouldGuardNavigation);
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldGuardNavigation && currentLocation.pathname !== nextLocation.pathname,
  );
  const isNavigationBlocked = navigationBlocker.state === 'blocked';

  const selectModel = (nextProvider: BuilderProvider, nextModelId: string) => {
    modelAccess.selectModel(nextProvider, nextModelId);
    setProvider(nextProvider);
    setModelId(nextModelId);
  };

  const setPreviewInteractionMode = (mode: PreviewInteractionMode) => {
    const preview = previewRef.current;
    if (!preview) {
      return;
    }
    previewToggleSequenceRef.current += 1;
    const sequence = previewToggleSequenceRef.current;
    const controller = new AbortController();
    void preview
      .setInteractionMode(mode, controller.signal)
      .then(() => {
        if (previewToggleSequenceRef.current === sequence) {
          setPreviewMode(mode);
        }
      })
      .catch(() => {});
  };

  const navigatePreview = async (target: string, historyIndex?: number) => {
    const preview = previewRef.current;
    if (!preview || previewNavigationPendingRef.current) {
      return 'The preview is busy. Wait a moment and try again.';
    }
    previewNavigationPendingRef.current = true;
    setPreviewNavigationPending(true);
    try {
      const result = await preview.navigate(target, new AbortController().signal);
      if (result.kind === 'virtual') {
        setPreviewHistory((current) => {
          if (historyIndex !== undefined) {
            const entries = [...current.entries];
            entries[historyIndex] = result.url;
            return { entries, index: historyIndex };
          }
          if (current.entries[current.index] === result.url) {
            return current;
          }
          const entries = [...current.entries.slice(0, current.index + 1), result.url];
          return { entries, index: entries.length - 1 };
        });
      }
      if (result.kind === 'failed') {
        return result.diagnostics[0]?.code === 'preview_navigation_blocked'
          ? 'Preview links need to stay on this site.'
          : 'Builder could not open that preview address.';
      }
      return true;
    } catch {
      return 'Builder could not open that preview address.';
    } finally {
      previewNavigationPendingRef.current = false;
      setPreviewNavigationPending(false);
    }
  };

  const traversePreviewHistory = (direction: -1 | 1) => {
    const nextIndex = previewHistory.index + direction;
    const target = previewHistory.entries[nextIndex];
    if (!target) {
      return;
    }
    void navigatePreview(target, nextIndex);
  };

  return (
    <>
      <BuilderShell
        attachments={attachmentList}
        backLabel="Back to Design settings"
        backTo="/settings/design"
        hasCredential={modelAccess.hasApiKey(provider)}
        interactionDisabled={inlineEditPending || previewNavigationPending}
        modelId={modelId}
        models={CURATED_MODELS}
        preview={
          <iframe
            ref={setIframe}
            className="size-full border-0 bg-background"
            title="Theme preview"
          />
        }
        previewCanGoBack={previewHistory.index > 0}
        previewCanGoForward={
          previewHistory.index >= 0 && previewHistory.index < previewHistory.entries.length - 1
        }
        previewControlsDisabled={
          inlineEditPending ||
          previewNavigationPending ||
          !['ready', 'interrupted'].includes(state.status)
        }
        previewEditingButtonRef={previewEditingButtonRef}
        previewMode={previewMode}
        previewUrl={previewUrl}
        provider={provider}
        publishAction={
          <PublishThemeDialog
            builtIn={publishTheme.builtIn}
            dirty={state.workspace.dirty}
            disabled={inlineEditPending || previewNavigationPending}
            installedThemeNames={installedThemeNames}
            publishState={publishState}
            sessionStatus={state.status}
            themeName={publishTheme.name}
            onPublish={async (copyName) => {
              pendingCopyNameRef.current = copyName;
              try {
                if (!session) {
                  throw new Error('The Builder session is not ready.');
                }
                const result = await session.publish();
                if (result.ok && publishTheme.builtIn && copyName) {
                  setPublishTheme({ name: copyName, builtIn: false });
                }
                return result;
              } finally {
                pendingCopyNameRef.current = undefined;
              }
            }}
          />
        }
        selection={selection}
        state={state}
        title="Design Builder"
        onAddAttachments={async (files) => {
          const result = await attachments.add(files);
          if (result.errors.length) {
            throw new Error(result.errors.map((error) => error.message).join(' '));
          }
        }}
        onForgetApiKey={(targetProvider) => {
          modelAccess.forgetApiKey(targetProvider);
          setCredentialVersion((value) => value + 1);
        }}
        onNavigatePreview={navigatePreview}
        onPreviewBack={() => traversePreviewHistory(-1)}
        onPreviewForward={() => traversePreviewHistory(1)}
        onRemoveAttachment={(id) => attachments.remove(id)}
        onRemoveSelection={() => void previewRef.current?.clearSelection()}
        onRetry={() => void session?.retryLastTurn()}
        onRewind={(messageId) =>
          session?.rewind(messageId) ??
          Promise.reject(new Error('The Builder session is not ready.'))
        }
        onSaveApiKey={(targetProvider, key) => {
          modelAccess.setApiKey(targetProvider, key);
          setCredentialVersion((value) => value + 1);
        }}
        onSelectModel={selectModel}
        onSetPreviewMode={setPreviewInteractionMode}
        onStop={() => session?.stop()}
        onSubmit={(value) =>
          session?.startTurn(value) ??
          Promise.reject(new Error('The Builder session is not ready.'))
        }
      />
      {inlineEditAnnouncement && (
        <span key={inlineEditAnnouncement.id} className="sr-only" role="status">
          {inlineEditAnnouncement.message}
        </span>
      )}
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
  const themes = useBrowseThemes();
  const settings = useBrowseSettings();
  const customSettings = useBrowseCustomThemeSettings();
  const site = useBrowseSite();
  const isLoading =
    activeTheme.isLoading ||
    themes.isLoading ||
    settings.isLoading ||
    customSettings.isLoading ||
    site.isLoading;
  const theme = activeTheme.data?.themes[0];
  const themeSettings = useMemo(
    () => compatibleSettings(settings.data?.settings ?? []),
    [settings.data],
  );
  const installedThemeNames = useMemo(
    () => themes.data?.themes.map((installed) => installed.name) ?? [],
    [themes.data],
  );

  if (isLoading) {
    return (
      <Box className="fixed inset-0 z-50 bg-background" padding="lg">
        <Stack align="center" className="size-full" gap="md" justify="center">
          <LoadingIndicator size="md" />
          <Text as="h1" size="xl" weight="semibold">
            Design Builder
          </Text>
          <Text tone="secondary">Loading the active theme…</Text>
        </Stack>
      </Box>
    );
  }

  if (
    activeTheme.isError ||
    themes.isError ||
    settings.isError ||
    customSettings.isError ||
    site.isError ||
    !theme ||
    !themes.data ||
    !settings.data ||
    !customSettings.data ||
    !site.data
  ) {
    return (
      <Box className="fixed inset-0 z-50 bg-background" padding="lg">
        <Stack align="center" className="size-full text-center" gap="sm" justify="center">
          <Text as="h1" size="xl" weight="semibold">
            Design Builder
          </Text>
          <Text tone="secondary">
            Builder could not load the active theme. Return to Design settings and try again.
          </Text>
          <Button variant="outline" asChild>
            <Link to="/settings/design">Back to Design settings</Link>
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <ThemeBuilderExperience
      customSettings={customSettings.data.custom_theme_settings}
      installedThemeNames={installedThemeNames}
      settings={themeSettings}
      siteUrl={site.data.site.url}
      theme={theme}
    />
  );
};

const BuilderRoute = () => {
  const [searchParams] = useSearchParams();
  const { data, isError, isLoading } = useBrowseConfig();
  const isUnavailable = isError || (!isLoading && data?.config.labs?.designBuilder !== true);

  if (isLoading) {
    return null;
  }

  if (isUnavailable) {
    return <Navigate state={unavailableNotice} to="/settings/design" replace />;
  }

  if (RuntimeProof && searchParams.get('proof') === 'pi') {
    return (
      <Suspense fallback={null}>
        <RuntimeProof />
      </Suspense>
    );
  }

  if (PreviewRuntimeProof && searchParams.get('proof') === 'preview') {
    return (
      <Suspense fallback={null}>
        <PreviewRuntimeProof />
      </Suspense>
    );
  }

  if (RewindRuntimeProof && searchParams.get('proof') === 'rewind') {
    return (
      <Suspense fallback={null}>
        <RewindRuntimeProof />
      </Suspense>
    );
  }

  if (PublishRuntimeProof && searchParams.get('proof') === 'publish') {
    return (
      <Suspense fallback={null}>
        <PublishRuntimeProof />
      </Suspense>
    );
  }

  return (
    <Box className="size-full" data-model-runtime={BrowserPiModelAccess.runtime}>
      <ThemeBuilderRoute />
    </Box>
  );
};

export default BuilderRoute;
