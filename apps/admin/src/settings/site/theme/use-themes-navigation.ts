import { useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import { useSettingsNavigation } from '@/settings/hooks/use-settings-navigation';

// Themes opened from the Design settings (`?from=design`) or from View site's
// Customize panel (`?from=customize`) goes back there: when it closes, and when a
// theme is previewed or customized from it. A preview opened from Themes in the
// Design settings goes back to Themes when it closes (`?from=themes`), to the
// view it came from (`themes_view`: the Installed tab, or an official theme's
// page), and Themes then goes back to wherever it was opened from (`themes_from`).

/** What Themes shows when it opens: the Installed tab, an official theme's page, or the list */
export type ThemesView = 'installed' | { officialTheme: string };

function useThemesOrigin() {
  const { updateRoute } = useSettingsNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');

  return {
    from,
    /** The theme tab of the Design settings, or of the Customize panel */
    openDesign: (params: URLSearchParams) => {
      const query = params.toString();
      if (from === 'customize') {
        navigate(`/site?customize&${query}`);
      } else {
        updateRoute(`design/edit?${query}`);
      }
    },
  };
}

export function useCloseThemes() {
  const { updateRoute } = useSettingsNavigation();
  const { from, openDesign } = useThemesOrigin();

  return () => {
    if (from === 'design' || from === 'customize') {
      openDesign(new URLSearchParams({ tab: 'theme' }));
    } else {
      updateRoute('');
    }
  };
}

/**
 * Opens a theme's preview, or the active theme's settings, where Themes was
 * opened from (the Design settings otherwise). `view` is what Themes showed, to
 * return to when the preview closes.
 */
export function useOpenThemePreview() {
  const { from, openDesign } = useThemesOrigin();

  return ({ theme, preset, view }: { theme?: string; preset?: string; view?: ThemesView } = {}) => {
    const params = new URLSearchParams({ tab: 'theme' });
    if (theme) {
      params.set('theme', theme);
    }
    if (preset) {
      params.set('preset', preset);
    }
    // The Customize panel is full-window, a page of its own: its close isn't Themes'
    if (from !== 'customize') {
      params.set('from', 'themes');
      if (view) {
        params.set('themes_view', view === 'installed' ? view : view.officialTheme);
      }
      if (from === 'design') {
        params.set('themes_from', from);
      }
    }
    openDesign(params);
  };
}

/** Where the Design settings close to: Themes, when a preview was opened from there */
export function getThemesReturnRoute(searchParams: URLSearchParams): string | null {
  if (searchParams.get('from') !== 'themes') {
    return null;
  }
  const params = new URLSearchParams();
  const view = searchParams.get('themes_view');
  const themesFrom = searchParams.get('themes_from');
  if (view) {
    params.set('view', view);
  }
  if (themesFrom === 'design') {
    params.set('from', themesFrom);
  }
  const query = params.toString();
  return `design/change-theme${query ? `?${query}` : ''}`;
}

/** The view a Themes link asks for (`?view=`): the Installed tab, or an official theme's page */
export function useInitialThemesView(): ThemesView | null {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  if (!view) {
    return null;
  }
  return view === 'installed' ? 'installed' : { officialTheme: view };
}
