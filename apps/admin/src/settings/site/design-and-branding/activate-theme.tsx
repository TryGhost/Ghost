import InvalidThemeModal, { type FatalErrors } from '@/settings/site/theme/invalid-theme-modal';
import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@tryghost/shade/components';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import { getThemeDisplayName } from './theme-names';

/** Confirms activating the previewed theme (see useActivatePreviewTheme) */
export const ActivateThemeDialog: React.FC<{
  previewTheme?: Theme;
  activeTheme?: Theme;
  /** Other unsaved changes, saved along with the activation */
  saveOtherChanges?: boolean;
  open: boolean;
  activating: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}> = ({
  previewTheme,
  activeTheme,
  saveOtherChanges,
  open,
  activating,
  onOpenChange,
  onConfirm,
}) => {
  const previewName = previewTheme ? getThemeDisplayName(previewTheme) : '';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="z-[1100] w-[calc(100%-2rem)] bg-background"
        data-testid="activate-theme-dialog"
        overlayClassName="z-[1100] bg-foreground/20! backdrop-blur-[3px]"
        onEscapeKeyDown={(event) => event.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Activate {previewName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Your site switches to {previewName} right away, with the settings you chose in the
            preview.
            {saveOtherChanges ? ' Your other unsaved changes are saved too.' : ''}
            {activeTheme
              ? ` ${getThemeDisplayName(activeTheme)} stays installed, so you can switch back any time.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            disabled={activating}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button disabled={activating} type="button" onClick={onConfirm}>
            {activating ? 'Activating...' : `Activate ${previewName}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/** Theme errors that stopped an activation, as the Themes list shows them */
export const ActivateThemeErrors: React.FC<{
  fatalErrors: { themeName: string; errors: FatalErrors } | null;
  onClose: () => void;
  onRetry: () => void;
}> = ({ fatalErrors, onClose, onRetry }) =>
  fatalErrors ? (
    <InvalidThemeModal
      action="activated"
      fatalErrors={fatalErrors.errors}
      themeName={fatalErrors.themeName}
      title="Theme not activated"
      onClose={onClose}
      onRetry={onRetry}
    />
  ) : null;
