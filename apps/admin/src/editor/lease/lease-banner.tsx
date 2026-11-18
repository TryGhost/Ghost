import { useState } from 'react';
import { createPortal } from 'react-dom';
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
  Avatar,
  Banner,
  Button,
} from '@tryghost/shade/components';
import { Inline, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { editorLeaseBanner, editorLeaseReloadConfirm } from '@tryghost/test-data/selectors/editor';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';
import type { ReloadOutcome } from '@/editor/session/use-editor-session';
import type { ActivePresence, PresenceResourceType } from '@/shared/presence/presence-api';
import { userInitials } from '@/shared/presence/present-users';
import { usePresentUsers } from '@/shared/presence/use-present-users';
import type { EditLease } from './use-edit-lease';

const NOBODY: ActivePresence[] = [];

// The floating glass set, as the main navigation wears it.
const GLASS = {
  backgroundImage: 'var(--surface-glass-highlight)',
  boxShadow: 'var(--shadow-glass-floating)',
};

const COMPACT = 'h-6 shrink-0 px-2';

export interface LeaseBannerProps {
  lease: EditLease;
  resourceId: string | null;
  resourceType: PresenceResourceType;
  /** The toolbar slot to render into; omitted to render in place. */
  target?: HTMLElement | null;
  hasUnsavedContent: () => boolean;
  contentText: () => string;
  onReload: (options?: { discardUnsaved?: boolean }) => Promise<ReloadOutcome>;
  onTakeOver: () => void;
}

function CopyContentButton({ contentText }: Pick<LeaseBannerProps, 'contentText'>) {
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(contentText());
      toast.success('Content copied');
    } catch {
      toast.error('Couldn’t copy your content');
    }
  };

  return (
    <Button className={COMPACT} size="sm" variant="secondary" onClick={() => void copyContent()}>
      Copy content
    </Button>
  );
}

/** Reloading here always discards unsaved work, so it always asks first. */
function ReloadButton({
  resourceType,
  onReload,
}: Pick<LeaseBannerProps, 'resourceType' | 'onReload'>) {
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);

  const reload = async () => {
    setConfirming(false);
    setReloading(true);
    const outcome = await onReload({ discardUnsaved: true });
    setReloading(false);
    if (outcome === 'gone' || outcome === 'failed') {
      toast.error(`Couldn’t reload this ${resourceType}`);
    }
  };

  return (
    <>
      <Button
        className={COMPACT}
        disabled={reloading}
        size="sm"
        variant="secondary"
        onClick={() => setConfirming(true)}
      >
        Reload
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent
          className={EDITOR_CONFIRM_DIALOG_LAYER}
          data-testid={editorLeaseReloadConfirm}
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

/**
 * Says why the editor is read-only and offers the way to edit: who holds the
 * document, that another of the writer's own tabs does, that a takeover is
 * under way, or that this tab's unsaved work is on a version since saved over.
 * A tab locked with unsaved work says it still has it and offers a copy.
 * Nothing is shown while the answer is still on its way.
 */
export function LeaseBanner({
  lease,
  resourceId,
  resourceType,
  target,
  hasUnsavedContent,
  contentText,
  onReload,
  onTakeOver,
}: LeaseBannerProps) {
  const held = lease.locked && lease.reason === 'held' ? lease : null;
  const other = held && !held.ownTab && resourceId ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );
  if (!lease.locked || lease.reason === 'pending' || target === null) {
    return null;
  }

  const outdated = lease.reason === 'outdated';
  const unsaved = held !== null && hasUnsavedContent();
  const who = holder?.name ?? 'Someone else';
  let summary = `Taking over this ${resourceType}…`;
  let detail: string | null = null;
  if (outdated) {
    summary = `Someone saved a newer version of this ${resourceType}.`;
    detail = 'Your unsaved changes are from an older one.';
  } else if (held) {
    summary = held.ownTab
      ? `This ${resourceType} is being edited in another of your tabs.`
      : held.lost
        ? `${who} took over editing this ${resourceType}.`
        : `${who} is editing this ${resourceType}.`;
    detail = unsaved
      ? 'Your unsaved changes are still here.'
      : held.ownTab
        ? 'It’s read-only here.'
        : 'It’s read-only for you.';
  }

  const banner = (
    <Banner
      className={cn(
        'max-w-full min-w-0 rounded-full border-border-glass bg-surface-glass p-1 backdrop-blur-md backdrop-saturate-150',
        !held && !outdated && 'pr-3',
      )}
      data-testid={editorLeaseBanner}
      role="status"
      size="sm"
      style={GLASS}
      variant="default"
    >
      <Inline align="center" className="min-w-0" gap="sm">
        <span aria-hidden="true" className="shrink-0">
          {holder && held ? (
            <Avatar
              className="size-7 border-2 border-background"
              colorSeed={holder.name}
              initials={userInitials(holder.name)}
              src={holder.image ?? undefined}
            />
          ) : (
            <Inline align="center" className="size-7 rounded-full bg-muted" justify="center">
              {outdated ? (
                <LucideIcon.TriangleAlert className="size-4 text-muted-foreground" />
              ) : held ? (
                <LucideIcon.Lock className="size-4 text-muted-foreground" />
              ) : (
                <LucideIcon.LoaderCircle className="size-4 animate-spin text-muted-foreground" />
              )}
            </Inline>
          )}
        </span>
        <Text
          as="div"
          className="min-w-0 text-base"
          title={detail ? `${summary} ${detail}` : summary}
          truncate
        >
          <strong>{summary}</strong>
          {detail ? ` ${detail}` : null}
        </Text>
        {held || outdated ? (
          <Inline align="center" className="shrink-0" gap="xs">
            {unsaved || outdated ? <CopyContentButton contentText={contentText} /> : null}
            {outdated ? (
              <ReloadButton resourceType={resourceType} onReload={onReload} />
            ) : (
              <Button className={COMPACT} size="sm" variant="secondary" onClick={onTakeOver}>
                {held?.ownTab ? 'Edit here' : 'Take over'}
              </Button>
            )}
          </Inline>
        ) : null}
      </Inline>
    </Banner>
  );
  return target ? createPortal(banner, target) : banner;
}
