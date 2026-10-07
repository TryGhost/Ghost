import React from 'react';
import { AppBanner, AppIcon } from './app-icon';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { PermissionList } from './permission-list';
import { SurfaceSummary } from './surface-icon';
import { appDeveloper } from '@/apps/lib/manifest';
import { type PermissionRow, updateRows } from '@/apps/lib/app-permissions';
import { approvePendingPermissions } from '@/apps/lib/installations';
import { toast } from 'sonner';
import type { AppInstallation, AppManifest } from '@/apps/types';

interface AppReviewProps {
  manifest: AppManifest;
  /** Installing asks for everything; an update asks only for what's new. */
  mode: 'install' | 'update';
  rows: PermissionRow[];
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The body of the dialog that asks the publisher to approve an app: who made
 * it, where it appears, and what it can reach. Installing and approving an
 * update share it, so both read the same way.
 */
export const AppReview: React.FC<AppReviewProps> = ({
  manifest,
  mode,
  rows,
  onCancel,
  onConfirm,
}) => (
  <>
    {/* A band the icon sits into, like a profile picture. */}
    <AppBanner className="-mx-6 -mt-6 h-28 shrink-0" color={manifest.color} />
    {/* -mt-14 pulls the 64px icon up past the dialog's 24px gap, so half of it
        overlaps the band; its ring matches the dialog to cut out the grey. */}
    <DialogHeader className="-mt-14 items-start">
      <AppIcon
        className="ring-4 ring-surface-elevated-2"
        color={manifest.color}
        icon={manifest.icon}
        size="xl"
        tone="brand"
      />
      <DialogTitle className="mt-3">{manifest.name}</DialogTitle>
      <Text data-testid="app-install-source" size="sm" tone="secondary">
        {appDeveloper(manifest)}
      </Text>
      {mode === 'install' && manifest.description && (
        <DialogDescription className="mt-2">{manifest.description}</DialogDescription>
      )}
      {mode === 'update' && (
        <DialogDescription className="mt-2">
          {manifest.name} has been updated and needs more access. It won’t open until you allow it.
        </DialogDescription>
      )}
    </DialogHeader>
    <Stack data-testid="app-surfaces" gap="sm">
      {manifest.surfaces.map((surface) => (
        <SurfaceSummary key={surface} color={manifest.color} surface={surface} />
      ))}
    </Stack>
    {/* Runs edge to edge, past the dialog's padding, to set the app's intro
        apart from what it asks for. */}
    <Separator className="-mx-6 w-auto" />
    <PermissionList rows={rows} />
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        {mode === 'install' ? 'Cancel' : 'Not now'}
      </Button>
      <Button onClick={onConfirm}>{mode === 'install' ? 'Install' : 'Allow access'}</Button>
    </DialogFooter>
  </>
);

/** Shared dialog chrome; the review is long enough to need its own scroll. */
export const AppReviewDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  'data-testid'?: string;
}> = ({ open, onOpenChange, children, 'data-testid': testId }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="max-h-[calc(100dvh-2rem)] max-w-md overflow-x-hidden overflow-y-auto"
      data-testid={testId}
    >
      {children}
    </DialogContent>
  </Dialog>
);

interface UpdateAppDialogProps {
  installation: AppInstallation | null;
  onOpenChange: (open: boolean) => void;
  /** After the access is allowed, e.g. to open the app. */
  onApproved?: (installation: AppInstallation) => void;
}

/** Asks the publisher to approve the extra access an updated app wants. */
export const UpdateAppDialog: React.FC<UpdateAppDialogProps> = ({
  installation,
  onOpenChange,
  onApproved,
}) => (
  <AppReviewDialog
    data-testid="app-update-dialog"
    open={installation !== null}
    onOpenChange={onOpenChange}
  >
    {installation && (
      <AppReview
        manifest={installation.manifest}
        mode="update"
        rows={updateRows(installation)}
        onCancel={() => onOpenChange(false)}
        onConfirm={() => {
          approvePendingPermissions(installation.id);
          toast.success(`${installation.manifest.name} updated`);
          onApproved?.(installation);
        }}
      />
    )}
  </AppReviewDialog>
);
