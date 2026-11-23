import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useBrowseThemes, useThemePreviewToken } from '@tryghost/admin-x-framework/api/themes';
import { getThemeDisplayName } from './theme-names';
import { toast } from 'sonner';
import { useCallback, useEffect, useState } from 'react';
import { useCheckThemeLimitError } from '@/settings/hooks/use-check-theme-limit-error';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation, useSearchParams } from '@tryghost/admin-x-framework';

/**
 * The installed themes, and the one the Design settings preview instead of the
 * active theme, if any. Kept in the URL (`?theme=`) like the rest of the
 * preview's state. Behind the themePreview labs flag, which also tells whether
 * the server can render a theme that isn't active: without it, nothing is
 * previewed and the picker isn't offered.
 */
export function useThemePreview() {
  // The labs flag, and a server that can render a theme that isn't active: Admin
  // and Core deploy separately, so the flag alone doesn't say the server has it
  const flagged = useFeatureFlag('themePreview');
  const { data: configData } = useBrowseConfig();
  const enabled = flagged && configData?.config.themePreview === true;
  const { data: { themes } = {}, isError: themesError } = useBrowseThemes({ enabled });
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const routeState: unknown = location.state;

  const activeTheme = themes?.find((theme) => theme.active);

  // What the picker offers, active first, then by name: on a plan that limits
  // themes, only the ones it allows, once the limits are known
  const { isThemeLimited, allowedThemesList, isThemeLimitCheckReady } = useCheckThemeLimitError();
  const ready = enabled && Boolean(themes) && isThemeLimitCheckReady;
  const pickableThemes = (ready ? themes || [] : [])
    .filter(
      (theme) =>
        theme.active ||
        !isThemeLimited ||
        !allowedThemesList ||
        allowedThemesList.includes(theme.name.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return getThemeDisplayName(a).localeCompare(getThemeDisplayName(b));
    });

  // While a previewed theme is being activated, it stays the previewed one,
  // although the themes list already says it's active
  const [held, setHeld] = useState<string | null>(null);

  const requested = enabled ? searchParams.get('theme') : null;
  const previewTheme =
    pickableThemes.find(
      (theme) => theme.name === requested && (!theme.active || theme.name === held),
    ) || undefined;
  // A link to a theme is still being checked: nothing is shown in its place yet
  // (unless the themes couldn't be loaded: then the site's own theme shows)
  const resolving = Boolean(requested) && !ready && !themesError;

  const setPreviewTheme = useCallback(
    (name: string | null) => {
      const params = new URLSearchParams(searchParams);
      if (name && name !== activeTheme?.name) {
        params.set('theme', name);
      } else {
        params.delete('theme');
      }
      setSearchParams(params, { replace: true, state: routeState });
    },
    [activeTheme?.name, routeState, searchParams, setSearchParams],
  );

  // A link to a theme that can't be previewed here (deleted, not on the plan, or
  // never installed) says so, and the site's theme shows instead
  useEffect(() => {
    if (!ready || !requested || held) {
      return;
    }
    const requestedTheme = (themes || []).find((theme) => theme.name === requested);
    if (requestedTheme?.active) {
      setPreviewTheme(null);
    } else if (!previewTheme) {
      toast.error(`"${requested}" can't be previewed`, {
        description: requestedTheme
          ? "Your plan doesn't include this theme."
          : 'No theme by that name is installed.',
      });
      setPreviewTheme(null);
    }
  }, [held, previewTheme, ready, requested, setPreviewTheme, themes]);

  // A token is kept until the site turns it down (it lasts an hour), then fetched
  // again: refreshing it on a timer would reload the preview each time
  const {
    data: tokenData,
    isError: tokenError,
    refetch: refetchToken,
  } = useThemePreviewToken(previewTheme?.name || '', {
    enabled: Boolean(previewTheme),
    staleTime: Infinity,
  });
  const previewToken = previewTheme
    ? tokenData?.theme_previews.find(({ theme }) => theme === previewTheme.name)?.token
    : undefined;

  return {
    enabled,
    pickableThemes,
    activeTheme,
    previewTheme,
    previewToken,
    previewTokenError: Boolean(previewTheme) && tokenError,
    /** Gets a new token, when the site turned the preview's down (expired) */
    refreshPreviewToken: () => void refetchToken(),
    resolving,
    setPreviewTheme,
    /** Keeps the previewed theme in place while it is being activated */
    holdPreviewTheme: setHeld,
  };
}
