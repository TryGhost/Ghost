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
import type { AppInstallation } from '@/apps/types';
import { AdminLink } from '@/shared/admin-link';

interface UninstallDialogProps {
  installation: AppInstallation | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (installation: AppInstallation) => void;
}

export const UninstallDialog: React.FC<UninstallDialogProps> = ({
  installation,
  onOpenChange,
  onConfirm,
}) => (
  <AlertDialog open={installation !== null} onOpenChange={onOpenChange}>
    <AlertDialogContent data-testid="uninstall-app-dialog">
      <AlertDialogHeader>
        <AlertDialogTitle>Uninstall {installation?.manifest.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          The app stops working immediately and nothing from it is kept. Reinstalling it later is
          like installing it for the first time.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {/* BER-3981: an integration key held by the app's backend outlives uninstall
          until Permissions and auth replaces those keys. */}
      <Banner data-testid="uninstall-integration-key-note" size="md" variant="warning">
        <p className="m-0 text-sm text-foreground">
          If you gave this app an integration key, delete it in{' '}
          <AdminLink className="font-semibold text-foreground" to="/settings/integrations">
            Settings › Integrations
          </AdminLink>
          . Uninstalling doesn’t remove it.
        </p>
      </Banner>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={() => {
            if (installation) {
              onConfirm(installation);
            }
          }}
        >
          Uninstall
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
