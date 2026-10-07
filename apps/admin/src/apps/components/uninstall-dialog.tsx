import React from 'react';
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
  onOpenChange: (open: boolean) => void;
  /** After Ghost has ended the installation, such as to leave a page about the app. */
  onUninstalled?: (installation: AppInstallation) => void;
}

/** Confirms uninstalling an app, which stops it straight away for everyone. */
export const UninstallDialog: React.FC<UninstallDialogProps> = ({
  installation,
  onOpenChange,
  onUninstalled,
}) => {
  const { mutateAsync: uninstall, isPending } = useUninstallAppInstallation();

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
    onOpenChange(false);
    onUninstalled?.(installation);
  };

  return (
    <AlertDialog open={installation !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="app-uninstall-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Uninstall {installation?.manifest.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The app stops working immediately for everyone. Reinstalling it later is like installing
            it for the first time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* An integration key the app's backend holds outlives uninstalling, until
            Permissions and auth replaces those keys. */}
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
