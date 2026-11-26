import React from 'react';
import {
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import type { PreviewedInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { AppIcon } from '@/apps/components/app-icon';

/**
 * The site has this app from this install link, so there's nothing to install. Its page shows the
 * app, or the review of whatever waits for approval.
 */
export const AlreadyInstalled: React.FC<{
  installation: PreviewedInstallation;
  onClose: () => void;
  onOpen: () => void;
}> = ({ installation, onClose, onOpen }) => (
  <>
    <DialogHeader className="gap-3">
      <Inline gap="md">
        <AppIcon app={installation} size="lg" />
        <DialogTitle>{installation.manifest.name} is already installed</DialogTitle>
      </Inline>
      <DialogDescription>There’s nothing to install. You can open it from here.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onOpen}>Open</Button>
    </DialogFooter>
  </>
);
