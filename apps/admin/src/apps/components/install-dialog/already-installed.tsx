import React from 'react';
import {
  Button,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';
import { Inline } from '@tryghost/shade/primitives';
import type { AppInstallationPreview } from '@tryghost/admin-x-framework/api/app-installations';
import { NoticeBanner } from './review-header';
import { AppIcon } from '@/apps/components/app-icon';

/** The site has this app already, exactly as reviewed: nothing to do. */
export const AlreadyInstalled: React.FC<{
  preview: AppInstallationPreview;
  notice?: string;
  onClose: () => void;
}> = ({ preview, notice, onClose }) => (
  <>
    <DialogHeader className="gap-3">
      <Inline gap="md">
        <AppIcon manifest={preview.manifest} size="lg" />
        <DialogTitle>{preview.manifest.name} is already installed</DialogTitle>
      </Inline>
      <DialogDescription>Nothing has changed since it was approved.</DialogDescription>
    </DialogHeader>
    <NoticeBanner notice={notice} />
    <DialogFooter>
      <Button onClick={onClose}>Done</Button>
    </DialogFooter>
  </>
);
