import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseCustomThemeSettings } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useBrowseRoutes } from '@tryghost/admin-x-framework/api/routes';
import { useActiveTheme, useBrowseThemes } from '@tryghost/admin-x-framework/api/themes';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Box, Stack, Text } from '@tryghost/shade/primitives';
import { inspectCanvasRouting } from '@/builder/canvas/route-compatibility';
import { ThemeCanvasExperience } from '@/builder/canvas/theme-canvas-experience';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import type { RouteCompatibility } from '@/builder/canvas/route-compatibility';

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

const ThemeBuilderRoute = () => {
  const activeTheme = useActiveTheme();
  const themes = useBrowseThemes();
  const settings = useBrowseSettings();
  const customSettings = useBrowseCustomThemeSettings();
  const site = useBrowseSite();
  const [routingProof, setRoutingProof] = useState<RouteCompatibility | null>(null);
  const routing = useBrowseRoutes({
    enabled: routingProof === null,
    retry: false,
    defaultErrorHandler: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  useEffect(() => {
    if (routingProof === null && !routing.isFetching && (routing.isSuccess || routing.isError)) {
      setRoutingProof(inspectCanvasRouting(routing.isError ? undefined : routing.data));
    }
  }, [routingProof, routing.isFetching, routing.isSuccess, routing.isError, routing.data]);
  const isLoading =
    activeTheme.isLoading ||
    themes.isLoading ||
    settings.isLoading ||
    customSettings.isLoading ||
    site.isLoading ||
    routingProof === null;
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

  if (routingProof && !routingProof.supported) {
    return (
      <Box className="fixed inset-0 z-50 bg-background" padding="lg">
        <Stack align="center" className="size-full text-center" gap="sm" justify="center">
          <Text as="h1" size="xl" weight="semibold">
            Design Builder
          </Text>
          <Text role="alert" tone="secondary">
            {routingProof.message}
          </Text>
          <Button variant="outline" asChild>
            <a href={site.data.site.url} rel="noopener noreferrer" target="_blank">
              Open site preview
            </a>
          </Button>
          <Button variant="link" asChild>
            <Link to="/settings/design">Back to Design settings</Link>
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <ThemeCanvasExperience
      customSettings={customSettings.data.custom_theme_settings}
      installedThemeNames={installedThemeNames}
      routing={routingProof}
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
    <Box className="size-full">
      <ThemeBuilderRoute />
    </Box>
  );
};

export default BuilderRoute;
