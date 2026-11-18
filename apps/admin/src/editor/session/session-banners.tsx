import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useBrowseUsers } from '@tryghost/admin-x-framework/api/users';
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
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';
import {
  editorConflictBanner,
  editorConflictReloadConfirm,
  editorNewerVersionNotice,
} from '@tryghost/test-data/selectors/editor';
import type { PendingSave, SaveError, SaveEngineState } from '@/editor/engine/save-engine';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';
import { reportShownAlert } from '@/editor/report-error';
import { PresenceAvatars } from '@/shared/presence/presence-avatars';
import { presentUsers } from '@/shared/presence/present-users';
import type { ActivePresence, PresenceResourceType } from '@/shared/presence/presence-api';
import { POST_DELETED, terminalSaveError } from './error-mapping';
import type { ReloadOutcome } from './use-editor-session';

const CONFLICT_SUMMARY = 'Someone else saved changes. Your changes weren’t saved.';
const CONFLICT_RECOVERY = 'Copy your content, then reload before saving again.';
const CONFLICT = `${CONFLICT_SUMMARY} ${CONFLICT_RECOVERY}`;
const NEWER_VERSION = 'This post was updated elsewhere.';
const RELOAD_FAILED = 'Couldn’t reload this post';

export interface SessionBannersProps {
  state: SaveEngineState;
  pendingSave?: PendingSave | null;
  /** Other staff on this document, supplied only while presence indicators are enabled. */
  activePresence?: ActivePresence[];
  /** The toolbar slot for presence and errors; omitted for inline notices. */
  presenceTarget?: HTMLElement | null;
  resourceType?: PresenceResourceType;
  /** A later version was saved elsewhere, and a reload onto it would lose nothing. */
  newerVersionAvailable?: boolean;
  hasUnsavedContent: () => boolean;
  contentText: () => string;
  onReload: (options?: { discardUnsaved?: boolean }) => Promise<ReloadOutcome>;
}

// Once per banner the writer reads, not per render of it.
function useShownAlert(message: string, error: SaveError): void {
  useEffect(() => {
    reportShownAlert(message, error);
  }, [message, error]);
}

type RecoveryActionsProps = Pick<
  SessionBannersProps,
  'hasUnsavedContent' | 'contentText' | 'onReload'
> & {
  resourceType: PresenceResourceType;
  destructive?: boolean;
  stopped?: boolean;
  onGone?: () => void;
  compact?: boolean;
};

function CopyContentButton({
  contentText,
  variant = 'default',
  compact = false,
}: Pick<SessionBannersProps, 'contentText'> & {
  variant?: 'default' | 'secondary';
  compact?: boolean;
}) {
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(contentText());
      toast.success('Content copied');
    } catch {
      toast.error('Couldn’t copy your content');
    }
  };

  return (
    <Button
      className={compact ? 'h-6 shrink-0 px-2' : 'shrink-0'}
      size="sm"
      variant={variant}
      onClick={() => void copyContent()}
    >
      Copy content
    </Button>
  );
}

/** Refused saves offer copying and a reload guarded against losing unsaved work. */
function RecoveryActions({
  hasUnsavedContent,
  contentText,
  onReload,
  resourceType,
  destructive = false,
  stopped = false,
  onGone,
  compact = false,
}: RecoveryActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);

  const reload = async (discardUnsaved = false) => {
    setConfirming(false);
    setReloading(true);
    const outcome = await onReload(discardUnsaved ? { discardUnsaved: true } : undefined);
    setReloading(false);
    if (outcome === 'gone') {
      if (onGone) {
        onGone();
      } else {
        toast.error(RELOAD_FAILED);
      }
    }
    if (outcome === 'failed') {
      toast.error(RELOAD_FAILED);
    }
  };

  return (
    <>
      <Inline align="center" className="shrink-0" gap={compact ? 'xs' : 'sm'} justify="center">
        <CopyContentButton
          compact={compact}
          contentText={contentText}
          variant={compact && !destructive ? 'secondary' : 'default'}
        />
        {!stopped && (
          <Button
            aria-label={compact ? 'Reload' : undefined}
            className={
              compact
                ? cn(
                    'size-6 shrink-0 rounded-full p-0',
                    destructive &&
                      'border-0 bg-state-danger/10 text-destructive shadow-none hover:bg-state-danger/20 enabled:active:bg-state-danger/20 enabled:active:shadow-none',
                  )
                : undefined
            }
            disabled={reloading}
            size={compact ? 'icon-sm' : 'sm'}
            title={compact ? 'Reload' : undefined}
            variant={compact ? 'secondary' : destructive ? 'destructive' : 'outline'}
            onClick={() => (hasUnsavedContent() ? setConfirming(true) : void reload())}
          >
            {compact ? <LucideIcon.RotateCw aria-hidden="true" className="stroke-2!" /> : 'Reload'}
          </Button>
        )}
      </Inline>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent
          className={EDITOR_CONFIRM_DIALOG_LAYER}
          data-testid={editorConflictReloadConfirm}
          overlayClassName={EDITOR_CONFIRM_DIALOG_LAYER}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Reloading replaces this {resourceType} with the version on the server. Anything you
              have not saved is lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={() => void reload(true)}>
                Discard and reload
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type ConflictBannerProps = RecoveryActionsProps & {
  error: SaveError;
};

function ConflictBanner({ error, stopped = false, ...actions }: ConflictBannerProps) {
  const [reloadFoundDeleted, setReloadFoundDeleted] = useState(false);
  const halt = stopped ? error : reloadFoundDeleted ? POST_DELETED : null;
  const message = halt ? halt.message : CONFLICT;
  useShownAlert(message, halt ?? error);

  return (
    <Banner
      className="max-w-full min-w-0 rounded-full p-1 backdrop-blur-md backdrop-saturate-150"
      data-testid={editorConflictBanner}
      role="alert"
      size="sm"
      style={{
        backgroundImage: 'var(--surface-glass-highlight)',
        boxShadow: 'var(--shadow-glass-floating)',
      }}
      variant="destructive"
    >
      <Inline align="center" className="min-w-0" gap="sm">
        <Inline
          align="center"
          aria-hidden="true"
          className="size-7 shrink-0 rounded-full bg-state-danger/10"
          justify="center"
        >
          <LucideIcon.TriangleAlert className="size-4 text-destructive" />
        </Inline>
        <Text as="div" className="min-w-0 text-base" title={message} truncate>
          {halt ? (
            message
          ) : (
            <>
              <strong>{CONFLICT_SUMMARY}</strong> {CONFLICT_RECOVERY}
            </>
          )}
        </Text>
        <RecoveryActions
          {...actions}
          stopped={halt !== null}
          compact
          destructive
          onGone={() => setReloadFoundDeleted(true)}
        />
      </Inline>
    </Banner>
  );
}

function PresenceWarning({
  active,
  resourceType,
  ...actions
}: RecoveryActionsProps & { active: ActivePresence[] }) {
  const { data } = useBrowseUsers({ defaultErrorHandler: false });
  const users = presentUsers(active, data?.users);
  const count = new Set(active.map((entry) => entry.userId)).size;
  const subject = count > 1 ? `${formatNumber(count)} others` : (users[0]?.name ?? 'Someone else');

  return (
    <Banner
      aria-label="Other editors"
      className="max-w-full min-w-0 rounded-full border-border-glass bg-surface-glass p-1 backdrop-blur-md backdrop-saturate-150"
      role="status"
      size="sm"
      style={{
        backgroundImage: 'var(--surface-glass-highlight)',
        boxShadow: 'var(--shadow-glass-floating)',
      }}
      variant="default"
    >
      <Inline align="center" className="min-w-0" gap="sm">
        <PresenceAvatars active={active} resourceType={resourceType} />
        <Text as="div" className="min-w-0 text-base" truncate>
          <strong>
            {subject} also {count === 1 ? 'has' : 'have'} this {resourceType} open.
          </strong>{' '}
          Your changes may not save.
        </Text>
        <RecoveryActions {...actions} resourceType={resourceType} compact />
      </Inline>
    </Banner>
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
        <Text className="text-base">{NEWER_VERSION}</Text>
        <Button
          className="bg-background"
          disabled={reloading}
          size="sm"
          variant="outline"
          onClick={() => void reload()}
        >
          Reload
        </Button>
      </Inline>
    </Banner>
  );
}

/**
 * Session feedback: collisions, halts and presence use the toolbar slot;
 * newer versions sit above the header. Other failed saves belong to the status
 * line, and fields held by their rules are marked beside the field.
 */
export function SessionBanners({
  state,
  pendingSave,
  activePresence,
  presenceTarget,
  resourceType = 'post',
  newerVersionAvailable = false,
  hasUnsavedContent,
  contentText,
  onReload,
}: SessionBannersProps) {
  const inToolbar = (notice: ReactNode) =>
    presenceTarget === undefined
      ? notice
      : presenceTarget
        ? createPortal(notice, presenceTarget)
        : null;
  const halt = terminalSaveError(state);
  const conflict =
    state.kind === 'conflict'
      ? state.error
      : (halt ?? (pendingSave?.blockedBy?.kind === 'conflict' ? pendingSave.blockedBy : null));
  if (conflict) {
    return inToolbar(
      <ConflictBanner
        contentText={contentText}
        error={conflict}
        hasUnsavedContent={hasUnsavedContent}
        resourceType={resourceType}
        stopped={halt !== null}
        onReload={onReload}
      />,
    );
  }

  if (newerVersionAvailable) {
    return <NewerVersionNotice onReload={onReload} />;
  }

  if (activePresence && activePresence.length > 0) {
    return inToolbar(
      <PresenceWarning
        active={activePresence}
        contentText={contentText}
        hasUnsavedContent={hasUnsavedContent}
        resourceType={resourceType}
        onReload={onReload}
      />,
    );
  }

  return null;
}
