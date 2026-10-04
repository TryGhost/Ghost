import { useEffect, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Label,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';

import { validateThemeCopyName } from './publish-theme';

import type { PublishResult } from '@/builder/core/workspace';
import type { BuilderSessionStatus } from '@/builder/core/builder-session';
import type { ThemePublishState } from './publish-theme';
import type { ThemePublicationReview } from '@/builder/workspaces/theme/theme-workspace';

function progressLabel(state: ThemePublishState): string | null {
  if (state.status !== 'publishing') {
    return null;
  }
  switch (state.stage) {
    case 'validation':
      return 'Validating theme archive…';
    case 'upload':
      return 'Uploading theme…';
    case 'activation':
      return 'Activating theme copy…';
    case 'settings':
      return 'Saving design settings…';
    default:
      return 'Publishing changes…';
  }
}

export const PublishThemeDialog = ({
  themeName,
  builtIn,
  dirty,
  disabled = false,
  installedThemeNames = [],
  sessionStatus,
  publishState,
  onPublish,
  review,
  currentRevision,
  onOpenReview,
  onCloseReview,
}: {
  themeName: string;
  builtIn: boolean;
  dirty: boolean;
  disabled?: boolean;
  installedThemeNames?: readonly string[];
  sessionStatus: BuilderSessionStatus;
  publishState: ThemePublishState;
  onPublish: (copyName?: string) => Promise<PublishResult>;
  review?: (ThemePublicationReview & { pending: { text: boolean; settings: boolean } }) | null;
  currentRevision?: string;
  onOpenReview?: () => void;
  onCloseReview?: () => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = onOpenReview ? !!review : internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    if (!next) {
      onCloseReview?.();
    }
  };
  const [copyName, setCopyName] = useState(`${themeName}-edited`);
  const [nameError, setNameError] = useState<string>();
  const [publishError, setPublishError] = useState<string>();
  const [staleFailure, setStaleFailure] = useState(false);
  const observedPublishState = useRef(publishState);
  observedPublishState.current = publishState;
  const stale = staleFailure || (!!review && review.revision !== currentRevision);
  const isPublishing = sessionStatus === 'publishing' || publishState.status === 'publishing';
  const canPublish =
    !disabled && dirty && (sessionStatus === 'ready' || sessionStatus === 'interrupted');
  const progress = progressLabel(publishState);
  const activeFailure = Boolean(publishError) && publishState.status === 'failed';
  const resumableFailure =
    publishState.status === 'failed' &&
    publishState.retryable !== false &&
    publishState.stage !== 'validation';
  const targetAlreadyUploaded =
    publishState.status === 'failed' &&
    (publishState.stage === 'activation' || publishState.stage === 'settings');
  const canRename = !isPublishing && !targetAlreadyUploaded;

  useEffect(() => {
    setCopyName(`${themeName}-edited`);
  }, [themeName]);
  useEffect(() => {
    if (review) {
      const state = observedPublishState.current;
      setPublishError(
        state.status === 'failed' && state.stage !== 'validation' && state.retryable !== false
          ? state.error
          : undefined,
      );
      setStaleFailure(false);
    }
  }, [review?.revision]);

  const openDialog = () => {
    setNameError(undefined);
    setPublishError(resumableFailure ? publishState.error : undefined);
    setStaleFailure(false);
    if (onOpenReview) {
      onOpenReview();
      return;
    }
    setOpen(true);
  };

  const closeForEditing = () => {
    setNameError(undefined);
    setPublishError(undefined);
    setOpen(false);
  };

  const submit = async () => {
    setNameError(undefined);
    setPublishError(undefined);
    let nextName: string | undefined;
    if (builtIn) {
      const validation = validateThemeCopyName(copyName, themeName, installedThemeNames);
      if (!validation.ok) {
        setNameError(validation.message);
        return;
      }
      nextName = validation.name;
    }
    try {
      const result = await onPublish(nextName);
      if (result.ok) {
        setOpen(false);
        return;
      }
      setPublishError(result.error.message);
      setStaleFailure(result.error.code === 'stale_publication_review');
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPublishing) {
          return;
        }
        setOpen(nextOpen);
        if (nextOpen) {
          setNameError(undefined);
          setPublishError(resumableFailure ? publishState.error : undefined);
        }
      }}
    >
      <Button
        aria-label="Publish changes"
        className="shrink-0"
        disabled={!canPublish}
        type="button"
        onClick={openDialog}
      >
        <span aria-hidden="true" className="hidden sm:inline">
          {sessionStatus === 'publishing' ? 'Publishing…' : 'Publish changes'}
        </span>
        <span aria-hidden="true" className="sm:hidden">
          {sessionStatus === 'publishing' ? 'Publishing…' : 'Publish'}
        </span>
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {builtIn ? 'Publish as a theme copy?' : 'Publish theme changes?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {builtIn
              ? `Ghost’s built-in ${themeName} theme cannot be overwritten. Builder will upload and activate a new copy, then save the staged design settings.`
              : `Builder will replace ${themeName} with the validated draft, then save the staged design settings. The live site will change immediately.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Stack gap="sm">
          {review && (
            <Stack gap="sm">
              <Text size="sm" weight="semibold">
                {formatNumber(review.totalFiles)} changed files ·{' '}
                {formatNumber(review.totalSettings)} changed settings
              </Text>
              <Stack className="max-h-40 overflow-y-auto" gap="xs">
                {review.files.slice(0, 20).map((file) => (
                  <Text key={file.path} className="break-all" size="sm">
                    {file.path}{' '}
                    <Text as="span" size="sm" tone="secondary">
                      ({file.change})
                    </Text>
                  </Text>
                ))}
                {review.settings.slice(0, 20).map((key) => {
                  const label = key.slice(key.indexOf('.') + 1).replace(/_/g, ' ');
                  return (
                    <Text key={key} size="sm">
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </Text>
                  );
                })}
                {(review.totalFiles > 20 || review.totalSettings > 20) && (
                  <Text size="sm" tone="secondary">
                    Additional changes are included in the totals above.
                  </Text>
                )}
              </Stack>
              {(review.pending.text || review.pending.settings) && (
                <Text size="sm" tone="secondary">
                  {review.pending.text && review.pending.settings
                    ? 'Pending text and unapplied settings are excluded and will be kept.'
                    : review.pending.text
                      ? 'Pending text is excluded and will be kept.'
                      : 'Unapplied settings are excluded and will be kept.'}
                </Text>
              )}
              {stale && (
                <Stack gap="xs">
                  <Text role="alert" size="sm">
                    The theme changed after review. Review the latest changes before publishing.
                  </Text>
                  <Button
                    disabled={isPublishing || disabled}
                    type="button"
                    variant="outline"
                    onClick={openDialog}
                  >
                    Review latest changes
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
          {builtIn && (
            <Stack gap="xs">
              <Label htmlFor="builder-theme-copy-name">Theme copy name</Label>
              <Input
                aria-invalid={Boolean(nameError)}
                autoComplete="off"
                disabled={!canRename}
                id="builder-theme-copy-name"
                maxLength={64}
                value={copyName}
                onChange={(event) => {
                  setCopyName(event.target.value);
                  setNameError(undefined);
                }}
              />
            </Stack>
          )}
          {progress && (
            <Text role="status" size="sm" tone="secondary">
              {progress}
            </Text>
          )}
          {nameError && (
            <Text className="text-destructive" role="alert" size="sm">
              {nameError}
            </Text>
          )}
          {publishError && (
            <Text className="text-destructive" role="alert" size="sm">
              {publishError}
            </Text>
          )}
        </Stack>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPublishing}>Cancel</AlertDialogCancel>
          <Button
            disabled={isPublishing || stale || (!!onOpenReview && disabled)}
            type="button"
            onClick={() =>
              activeFailure && publishState.retryable === false ? closeForEditing() : void submit()
            }
          >
            {isPublishing
              ? 'Publishing…'
              : activeFailure && publishState.retryable === false
                ? 'Close and fix theme'
                : resumableFailure
                  ? 'Retry publish'
                  : builtIn
                    ? 'Publish and activate copy'
                    : 'Publish changes'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
