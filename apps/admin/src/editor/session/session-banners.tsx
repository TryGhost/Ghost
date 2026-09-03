import { useState } from 'react';
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
import type { SaveError, SaveEngineState } from '@/editor/engine/save-engine';
import type { ReloadOutcome } from './use-editor-session';

const SESSION_EXPIRED = 'Your session expired. Sign in again in a new tab, then retry.';
const CONFLICT =
  'Someone else is editing this post. Reloading replaces what you have with their version, so copy your content first if you need it.';
const GONE =
  'This post has been deleted. Copy your content and paste it into a new post to keep it.';

export interface SessionBannersProps {
  state: SaveEngineState;
  hasUnsavedContent: () => boolean;
  contentText: () => string;
  onRetryReauth: () => void;
  onDismissReauth: () => void;
  onRetrySave: () => void;
  onReload: () => Promise<ReloadOutcome>;
}

function saveErrorMessage(error: SaveError): string {
  switch (error.kind) {
    case 'session-invalid':
      return SESSION_EXPIRED;
    case 'transport':
      return 'Couldn’t reach the server. Your changes are still here.';
    default:
      return error.message;
  }
}

type ConflictBannerProps = Pick<
  SessionBannersProps,
  'hasUnsavedContent' | 'contentText' | 'onReload'
> & {
  deleted?: boolean;
};

function ConflictBanner({
  hasUnsavedContent,
  contentText,
  onReload,
  deleted = false,
}: ConflictBannerProps) {
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadFoundDeleted, setReloadFoundDeleted] = useState(false);
  const gone = deleted || reloadFoundDeleted;

  const reload = async () => {
    setConfirming(false);
    setReloading(true);
    const outcome = await onReload();
    setReloading(false);
    if (outcome === 'gone') {
      setReloadFoundDeleted(true);
    }
    if (outcome === 'failed') {
      toast.error('Couldn’t reload this post');
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
        className="mx-4 mb-2 shrink-0"
        data-testid="editor-conflict-banner"
        role="alert"
        size="sm"
        variant="destructive"
      >
        <Inline align="center" gap="sm">
          <Text>{gone ? GONE : CONFLICT}</Text>
          {!gone && (
            <Button
              disabled={reloading}
              size="sm"
              variant="outline"
              onClick={() => (hasUnsavedContent() ? setConfirming(true) : void reload())}
            >
              Reload
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => void copyContent()}>
            Copy content
          </Button>
        </Inline>
      </Banner>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent
          className="z-[1100]"
          data-testid="editor-conflict-reload-confirm"
          overlayClassName="z-[1100]"
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

export function SessionBanners({
  state,
  hasUnsavedContent,
  contentText,
  onRetryReauth,
  onDismissReauth,
  onRetrySave,
  onReload,
}: SessionBannersProps) {
  if (state.kind === 'reauth-pending') {
    return (
      <Banner
        className="mx-4 mb-2 shrink-0"
        data-testid="editor-reauth-banner"
        role="alert"
        size="sm"
        variant="warning"
      >
        <Inline align="center" gap="sm">
          <Text>{SESSION_EXPIRED}</Text>
          <Button size="sm" variant="outline" onClick={onRetryReauth}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismissReauth}>
            Dismiss
          </Button>
        </Inline>
      </Banner>
    );
  }

  if (state.kind === 'conflict' || state.kind === 'halted') {
    return (
      <ConflictBanner
        contentText={contentText}
        deleted={state.kind === 'halted'}
        hasUnsavedContent={hasUnsavedContent}
        onReload={onReload}
      />
    );
  }

  // A save that stopped working is never silent: the writer keeps a way to retry.
  if (state.kind === 'error') {
    return (
      <Banner
        className="mx-4 mb-2 shrink-0"
        data-testid="editor-save-error-banner"
        role="alert"
        size="sm"
        variant="destructive"
      >
        <Inline align="center" gap="sm">
          <Text>{saveErrorMessage(state.error)}</Text>
          <Button size="sm" variant="outline" onClick={onRetrySave}>
            Retry
          </Button>
        </Inline>
      </Banner>
    );
  }

  return null;
}
