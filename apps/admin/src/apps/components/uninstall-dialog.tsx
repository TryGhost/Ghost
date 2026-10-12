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
  /** The app to uninstall; the dialog is open while it's set. */
  installation: AppInstallation | null;
  /** Called when the dialog closes, including after uninstalling. */
  onClose: () => void;
  /** Called after the app has been uninstalled. */
  onUninstalled?: (installation: AppInstallation) => void;
}

export const UninstallDialog: React.FC<UninstallDialogProps> = ({
  installation,
  onClose,
  onUninstalled,
}) => {
  const { mutateAsync: uninstall, isPending } = useUninstallAppInstallation();
  // The app last shown, so the dialog still names it while it closes.
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
        if (!open) {
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
