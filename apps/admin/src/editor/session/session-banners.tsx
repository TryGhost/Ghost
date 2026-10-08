import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Button,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import {
  editorConflictBanner,
  editorConflictReloadConfirm,
  editorNewerVersionNotice,
} from '@tryghost/test-data/selectors/editor';
import type { PendingSave, SaveError, SaveEngineState } from '@/editor/engine/save-engine';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';
import { ErrorLine } from '@/editor/publish/components/failure-banner';
import { reportShownAlert } from '@/editor/report-error';
import { POST_DELETED, terminalSaveError } from './error-mapping';
import type { ReloadOutcome } from './use-editor-session';

const CONFLICT =
  'Someone else is editing this post. Reloading replaces what you have with their version, so copy your content first if you need it.';
const NEWER_VERSION = 'This post was updated elsewhere.';
const RELOAD_FAILED = 'Couldn’t reload this post';

export interface SessionBannersProps {
  state: SaveEngineState;
  pendingSave?: PendingSave | null;
  /** A later version was saved elsewhere, and a reload onto it would lose nothing. */
  newerVersionAvailable?: boolean;
  hasUnsavedContent: () => boolean;
  contentText: () => string;
  onReload: () => Promise<ReloadOutcome>;
}

// Once per banner the writer reads, not per render of it.
function useShownAlert(message: string, error: SaveError): void {
  useEffect(() => {
    reportShownAlert(message, error);
  }, [message, error]);
}

type ConflictBannerProps = Pick<
  SessionBannersProps,
  'hasUnsavedContent' | 'contentText' | 'onReload'
> & {
  error: SaveError;
  /** Saving has stopped for good: the error says why, and copying is the only way out. */
  stopped?: boolean;
};

function ConflictBanner({
  hasUnsavedContent,
  contentText,
  onReload,
  error,
  stopped = false,
}: ConflictBannerProps) {
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadFoundDeleted, setReloadFoundDeleted] = useState(false);
  const halt = stopped ? error : reloadFoundDeleted ? POST_DELETED : null;
  const message = halt ? halt.message : CONFLICT;
  useShownAlert(message, halt ?? error);

  const reload = async () => {
    setConfirming(false);
    setReloading(true);
    const outcome = await onReload();
    setReloading(false);
    if (outcome === 'gone') {
      setReloadFoundDeleted(true);
    }
    if (outcome === 'failed') {
      toast.error(RELOAD_FAILED);
    }
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(contentText());
      toast.success('Content copied');
    } catch {
      toast.error('Couldn’t copy your content');
    }
  };

  return (
    <>
      <Banner
        className="mx-4 mt-3 shrink-0"
        data-testid={editorConflictBanner}
        role="alert"
        size="sm"
        variant="destructive"
      >
        <Inline align="center" gap="sm" justify="center" wrap>
          <Text as="div" className="text-center">
            <ErrorLine className="inline-flex">{message}</ErrorLine>
          </Text>
          <Inline align="center" gap="sm" justify="center">
            {!halt && (
              <Button
                disabled={reloading}
                variant="destructive"
                onClick={() => (hasUnsavedContent() ? setConfirming(true) : void reload())}
              >
                Reload
              </Button>
            )}
            <Button variant="outline" onClick={() => void copyContent()}>
              Copy content
            </Button>
          </Inline>
        </Inline>
      </Banner>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent
          className={EDITOR_CONFIRM_DIALOG_LAYER}
          data-testid={editorConflictReloadConfirm}
          overlayClassName={EDITOR_CONFIRM_DIALOG_LAYER}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Reloading replaces this post with the version on the server. Anything you have not
              saved is lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => void reload()}>
                Discard and reload
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewerVersionNotice({ onReload }: Pick<SessionBannersProps, 'onReload'>) {
  const [reloading, setReloading] = useState(false);

  const reload = async () => {
    setReloading(true);
    const outcome = await onReload();
    setReloading(false);
    if (outcome === 'gone' || outcome === 'failed') {
      toast.error(RELOAD_FAILED);
    }
  };

  return (
    <Banner
      className="mx-4 mt-3 shrink-0"
      data-testid={editorNewerVersionNotice}
      role="status"
      size="sm"
      variant="info"
    >
      <Inline align="center" gap="sm">
        <Text>{NEWER_VERSION}</Text>
        <Button disabled={reloading} size="sm" variant="outline" onClick={() => void reload()}>
          Reload
        </Button>
      </Inline>
    </Banner>
  );
}

/**
 * The notices above the header for what the status line cannot hold: a
 * collision or a halt with its ways out, and a newer version. A failed save is
 * the status line's to report, with its retry; a field held by its rule is
 * marked beside the field.
 */
export function SessionBanners({
  state,
  pendingSave,
  newerVersionAvailable = false,
  hasUnsavedContent,
  contentText,
  onReload,
}: SessionBannersProps) {
  const halt = terminalSaveError(state);
  const conflict =
    state.kind === 'conflict'
      ? state.error
      : (halt ?? (pendingSave?.blockedBy?.kind === 'conflict' ? pendingSave.blockedBy : null));
  if (conflict) {
    return (
      <ConflictBanner
        contentText={contentText}
        error={conflict}
        hasUnsavedContent={hasUnsavedContent}
        stopped={halt !== null}
        onReload={onReload}
      />
    );
  }

  if (newerVersionAvailable) {
    return <NewerVersionNotice onReload={onReload} />;
  }

  return null;
}
