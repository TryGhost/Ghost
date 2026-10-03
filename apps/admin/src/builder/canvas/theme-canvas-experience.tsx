import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useConfirmUnload } from '@tryghost/admin-x-framework';
import { getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import {
  downloadThemeArchive,
  isDefaultOrLegacyTheme,
} from '@tryghost/admin-x-framework/api/themes';
import { useQueryClient } from '@tanstack/react-query';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { scrapeContentApiKey } from '@tryghost/theme-renderer/editor/instance-config';
import { loadThemeDraft } from '@/builder/workspaces/theme/theme-loader';
import { PublishThemeDialog } from '@/builder/workspaces/theme/publish/publish-theme-dialog';
import {
  createAdminThemePublishTransport,
  ThemePublisher,
} from '@/builder/workspaces/theme/publish/publish-theme';
import { ThemeCanvas } from './theme-canvas';
import { SiteCanvasDriver, canvasThemeFiles } from './site-canvas-driver';
import type { Theme } from '@tryghost/admin-x-framework/api/themes';
import type { CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import type { ThemePublishState } from '@/builder/workspaces/theme/publish/publish-theme';
import type { BuilderWorkspaceState } from '@/builder/core/workspace';
import type { CanvasSource } from './canvas-driver';
import type { RouteCompatibility } from './route-compatibility';

type Inputs = {
  theme: Theme;
  settings: Array<{ key: string; value: string | boolean | null }>;
  customSettings: CustomThemeSetting[];
  installedThemeNames: string[];
  siteUrl: string;
  routing: RouteCompatibility;
};

async function contentResponse(
  siteUrl: string,
  key: string,
  resource: 'settings' | 'posts',
  signal: AbortSignal,
) {
  const url = new URL(`${siteUrl.replace(/\/$/, '')}/ghost/api/content/${resource}/`);
  url.searchParams.set('key', key);
  if (resource === 'posts') {
    url.searchParams.set('limit', '1');
    url.searchParams.set('fields', 'id,title,url');
  }
  // eslint-disable-next-line no-restricted-syntax -- Public Content API inputs to the browser theme renderer.
  const response = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Could not load ${resource} for the theme canvas (${response.status}).`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Invalid ${resource} response for the theme canvas.`);
  }
  return payload as Record<string, unknown>;
}

async function loadCanvas(inputs: Inputs, signal: AbortSignal) {
  const [archiveResponse, liveResponse] = await Promise.all([
    downloadThemeArchive(getGhostPaths().apiRoot, inputs.theme.name, signal),
    // eslint-disable-next-line no-restricted-syntax -- Public preview HTML supplies the installed renderer configuration.
    fetch(`${inputs.siteUrl}?admin_toolbar=0`, {
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
  if (!archiveResponse.ok || !liveResponse.ok) {
    throw new Error('Could not load the active theme or inspect the site.');
  }
  const [archive, liveHtml] = await Promise.all([
    archiveResponse.arrayBuffer(),
    liveResponse.text(),
  ]);
  const contentApiKey = scrapeContentApiKey(liveHtml);
  if (!contentApiKey) {
    throw new Error('The site did not expose the Content API configuration required by Builder.');
  }
  const [settings, posts] = await Promise.all([
    contentResponse(inputs.siteUrl, contentApiKey, 'settings', signal),
    contentResponse(inputs.siteUrl, contentApiKey, 'posts', signal),
  ]);
  const settingsPayload = settings.settings;
  if (
    !settingsPayload ||
    typeof settingsPayload !== 'object' ||
    Array.isArray(settingsPayload) ||
    !Array.isArray(posts.posts)
  ) {
    throw new Error('The site returned invalid theme canvas inputs.');
  }
  let postUrl: string | undefined;
  if (posts.posts.length) {
    const first: unknown = posts.posts[0];
    if (!first || typeof first !== 'object' || !('url' in first) || typeof first.url !== 'string') {
      throw new Error('The published Post did not provide a usable URL.');
    }
    const url = new URL(first.url);
    const site = new URL(inputs.siteUrl);
    if (
      url.origin !== site.origin ||
      !url.pathname.startsWith(site.pathname.endsWith('/') ? site.pathname : `${site.pathname}/`) ||
      url.search ||
      url.hash
    ) {
      throw new Error('The published Post URL is outside this site.');
    }
    postUrl = url.href;
  }
  const draft = await loadThemeDraft(
    {
      archive,
      settings: inputs.settings,
      customSettings: inputs.customSettings,
      site: {
        url: inputs.siteUrl,
        contentApiKey,
        liveHtml,
        settingsPayload: settingsPayload as Record<string, unknown>,
      },
      theme: { name: inputs.theme.name, builtIn: isDefaultOrLegacyTheme(inputs.theme) },
    },
    signal,
  );
  return { draft, routes: { home: new URL(inputs.siteUrl).href, post: postUrl } };
}

export function ThemeCanvasExperience(props: Inputs) {
  const [inputs] = useState(() => props);
  const [source, setSource] = useState<CanvasSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceState, setWorkspaceState] = useState<BuilderWorkspaceState>({
    revision: '',
    dirty: false,
    validation: null,
  });
  const [activity, setActivity] = useState({
    manualDraft: false,
    busy: false,
    mutationPending: false,
  });
  const [publishing, setPublishing] = useState(false);
  const [publishWarning, setPublishWarning] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<ThemePublishState>({
    status: 'idle',
    stage: 'idle',
  });
  const [publishTheme, setPublishTheme] = useState({
    name: inputs.theme.name,
    builtIn: isDefaultOrLegacyTheme(inputs.theme),
  });
  const driver = useRef<SiteCanvasDriver | null>(null);
  const copyName = useRef<string>();
  const serverMutation = useRef(false);
  const leaveConfirmed = useRef(false);
  const queryClient = useQueryClient();
  const editorObservation = useRef({ workspace: workspaceState, publication: publishState });
  const observeActivity = useCallback((next: typeof activity) => setActivity(next), []);

  useEffect(() => {
    const lifetime = new AbortController();
    let unsubscribeWorkspace = () => {};
    let unsubscribePublisher = () => {};
    let current: SiteCanvasDriver | null = null;
    void loadCanvas(inputs, lifetime.signal)
      .then(async ({ draft, routes }) => {
        lifetime.signal.throwIfAborted();
        const publisher = new ThemePublisher({
          baseline: draft,
          installedThemeNames: inputs.installedThemeNames,
          transport: createAdminThemePublishTransport(getGhostPaths().apiRoot),
          onServerMutation: () => {
            serverMutation.current = true;
          },
        });
        unsubscribePublisher = publisher.subscribe((next) => {
          editorObservation.current.publication = next;
          setPublishState(next);
        });
        current = new SiteCanvasDriver({
          draft,
          routes,
          publish: (candidate, signal) =>
            publisher.publish(candidate, { copyName: copyName.current }, signal),
        });
        driver.current = current;
        unsubscribeWorkspace = current.workspace.subscribe((next) => {
          editorObservation.current.workspace = next;
          setWorkspaceState(next);
        });
        await current.start();
        lifetime.signal.throwIfAborted();
        const loaded = current;
        setSource({
          fixture: false,
          id: current.workspace.id,
          label: draft.theme.name,
          version: draft.theme.version,
          revision: draft.revision,
          files: canvasThemeFiles(draft),
          siteUrl: inputs.siteUrl,
          routes,
          routing: inputs.routing,
          editor: {
            readDraft: () => loaded.workspace.draft,
            state: () => ({
              dirty: editorObservation.current.workspace.dirty,
              publication: editorObservation.current.publication,
              history: loaded.readHistory(),
            }),
          },
          // The route owns workspace lifetime. Canvas connections only own subscriptions.
          createDriver: () => ({
            render: (edit) => loaded.render(edit),
            applyThemePatch: (patch, signal) => loaded.applyThemePatch(patch, signal),
            readHistory: () => loaded.readHistory(),
            restoreHistory: (input, signal) => loaded.restoreHistory(input, signal),
            loadAssets: () => loaded.loadAssets(),
            subscribe: (deliver) => loaded.subscribe(deliver),
            dispose: () => {},
          }),
        });
      })
      .catch((failure: unknown) => {
        if (!lifetime.signal.aborted) {
          current?.dispose();
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      });
    return () => {
      lifetime.abort();
      unsubscribeWorkspace();
      unsubscribePublisher();
      current?.dispose();
      driver.current = null;
      if (serverMutation.current) {
        void queryClient.invalidateQueries({ queryKey: ['ThemesResponseType'] });
        void queryClient.invalidateQueries({ queryKey: ['SettingsResponseType'] });
        void queryClient.invalidateQueries({ queryKey: ['CustomThemeSettingsResponseType'] });
      }
    };
  }, [inputs, queryClient]);

  const shouldGuard =
    workspaceState.dirty || activity.manualDraft || activity.mutationPending || publishing;
  useConfirmUnload(shouldGuard);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldGuard && currentLocation.pathname !== nextLocation.pathname,
  );
  const back = (
    <Button variant="link" asChild>
      <Link to="/settings/design">Back to Design settings</Link>
    </Button>
  );
  return (
    <Box className="fixed inset-0 z-50 bg-background">
      {source ? (
        <ThemeCanvas
          externalBusy={publishing}
          externalNotice={publishWarning}
          headerActions={
            <PublishThemeDialog
              builtIn={publishTheme.builtIn}
              dirty={workspaceState.dirty}
              disabled={activity.busy || activity.manualDraft}
              installedThemeNames={inputs.installedThemeNames}
              publishState={publishState}
              sessionStatus={publishing ? 'publishing' : 'ready'}
              themeName={publishTheme.name}
              onPublish={async (name) => {
                if (!driver.current) {
                  throw new Error('The canvas is not ready.');
                }
                copyName.current = name;
                setPublishing(true);
                setPublishWarning(null);
                try {
                  const result = await driver.current.publish(new AbortController().signal);
                  setPublishWarning(result.previewWarning ?? null);
                  if (result.ok && publishTheme.builtIn && name) {
                    setPublishTheme({ name, builtIn: false });
                  }
                  return result;
                } finally {
                  copyName.current = undefined;
                  setPublishing(false);
                }
              }}
            />
          }
          headerLeading={
            <Button aria-label="Back to Design settings" size="icon" variant="ghost" asChild>
              <Link to="/settings/design">
                <LucideIcon.ArrowLeft />
              </Link>
            </Button>
          }
          source={source}
          onActivity={observeActivity}
        />
      ) : (
        <Stack align="center" className="size-full" gap="md" justify="center">
          <Text as="h1" size="xl" weight="semibold">
            Design Builder
          </Text>
          {error ? (
            <Text role="alert">{error}</Text>
          ) : (
            <>
              <LoadingIndicator size="md" />
              <Text tone="secondary">Loading the active theme…</Text>
            </>
          )}
          {back}
        </Stack>
      )}
      <DirtyConfirmDialog
        open={blocker.state === 'blocked'}
        onConfirm={() => {
          leaveConfirmed.current = true;
          blocker.proceed?.();
        }}
        onOpenChange={(open) => {
          if (!open) {
            if (leaveConfirmed.current) {
              leaveConfirmed.current = false;
            } else {
              blocker.reset?.();
            }
          }
        }}
      />
    </Box>
  );
}
