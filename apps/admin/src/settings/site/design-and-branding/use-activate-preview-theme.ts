import useCustomFonts from '@/settings/hooks/use-custom-fonts';
import { type FatalErrors } from '@/settings/site/theme/invalid-theme-modal';
import { type PreviewThemeActivation } from './use-design-form';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import { getThemeDisplayName } from './theme-names';
import { toast } from 'sonner';
import { useState } from 'react';

/**
 * Activating the previewed theme, after a confirmation: shared by the Design
 * modal and View site's Customize panel. What the dialog names is fixed when it
 * opens, and the previewed theme is held in place until activation is done, so
 * nothing changes under the dialog while the request runs.
 */
export function useActivatePreviewTheme({
  previewTheme,
  activeTheme,
  activatePreviewTheme,
  holdPreviewTheme,
  onActivated,
}: {
  previewTheme?: Theme;
  activeTheme?: Theme;
  /** From useDesignForm */
  activatePreviewTheme: () => Promise<PreviewThemeActivation>;
  /** From useThemePreview */
  holdPreviewTheme: (name: string | null) => void;
  onActivated: () => void;
}) {
  const { refreshActiveThemeData } = useCustomFonts();
  const [request, setRequest] = useState<{ previewTheme: Theme; activeTheme?: Theme } | null>(null);
  const [activating, setActivating] = useState(false);
  const [fatalErrors, setFatalErrors] = useState<{ themeName: string; errors: FatalErrors } | null>(
    null,
  );

  const activate = async () => {
    if (!request) {
      return;
    }
    const { previewTheme: theme } = request;
    setActivating(true);
    holdPreviewTheme(theme.name);
    const result = await activatePreviewTheme();
    setActivating(false);
    setRequest(null);

    if (result.activated) {
      refreshActiveThemeData();
      onActivated();
      toast.success('Theme activated', {
        description: `${getThemeDisplayName(theme)} is now your active theme.`,
      });
    } else if (result.fatalErrors) {
      setFatalErrors({ themeName: getThemeDisplayName(theme), errors: result.fatalErrors });
    }
    holdPreviewTheme(null);
  };

  return {
    /** Asks first; the dialog's own button activates */
    requestActivation: () => {
      if (previewTheme) {
        setRequest({ previewTheme, activeTheme });
      }
    },
    activating,
    dialogProps: {
      previewTheme: request?.previewTheme,
      activeTheme: request?.activeTheme,
      open: Boolean(request),
      activating,
      onOpenChange: (open: boolean) => {
        if (!open && !activating) {
          setRequest(null);
        }
      },
      onConfirm: () => void activate(),
    },
    /** Theme errors that stopped the activation, shown in their own modal */
    fatalErrors,
    retry: () => {
      setFatalErrors(null);
      if (previewTheme) {
        setRequest({ previewTheme, activeTheme });
      }
    },
    dismissFatalErrors: () => setFatalErrors(null),
  };
}
