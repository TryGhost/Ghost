import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Button,
} from '@tryghost/shade/components';
import { toast } from 'sonner';
import {
  type AppInstallation,
  useUninstallAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { AdminLink } from '@/shared/admin-link';

interface UninstallDialogProps {
  installation: AppInstallation | null;
  /**
   * Called whenever the dialog closes.
   * That includes after a successful uninstall, just before `onUninstalled`.
   */
  onClose: () => void;
  onUninstalled?: (installation: AppInstallation) => void;
}

export const UninstallDialog: React.FC<UninstallDialogProps> = ({
  installation,
  onClose,
  onUninstalled,
}) => {
  const { mutateAsync: uninstall, isPending } = useUninstallAppInstallation();
  // `installation` turns null as soon as the dialog starts to close.
  // Keep the last one so the title doesn't go blank during the animation.
  const [shown, setShown] = useState(installation);
  if (installation && installation !== shown) {
    setShown(installation);
  }

  const confirm = async () => {
    if (!installation) {
      return;
    }
    const { name } = installation.manifest;
    try {
      await uninstall(installation.id);
    } catch (error) {
      toast.error(getErrorMessage(error, `Couldn’t uninstall ${name}. Please try again.`));
      return;
    }
    toast.success(`${name} uninstalled`);
    onClose();
    onUninstalled?.(installation);
  };

  return (
    <AlertDialog
      open={installation !== null}
      onOpenChange={(open) => {
        // Stay open while the request runs.
        // Otherwise Escape makes it look cancelled when the app is still uninstalled.
        if (!open && !isPending) {
          onClose();
        }
      }}
    >
      <AlertDialogContent data-testid="app-uninstall-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Uninstall {shown?.manifest.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The app stops working immediately for everyone. Reinstalling it later is like installing
            it for the first time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Banner data-testid="app-uninstall-integration-key-note" size="md" variant="warning">
          <p className="m-0 text-sm text-foreground">
            If you gave this app an integration key, delete it in{' '}
            <AdminLink className="font-semibold text-foreground" to="/settings/integrations">
              Settings › Integrations
            </AdminLink>
            . Uninstalling doesn’t remove it.
          </p>
        </Banner>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button disabled={isPending} variant="destructive" onClick={() => void confirm()}>
            Uninstall
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
