import { type ReactNode, useEffect, useRef, useState } from 'react';
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
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  editorLeaseBanner,
  editorLeaseLock,
  editorLeaseReloadConfirm,
} from '@tryghost/test-data/selectors/editor';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';
import type { ReloadOutcome } from '@/editor/session/use-editor-session';
import type { ActivePresence, PresenceResourceType } from '@/shared/presence/presence-api';
import { type PresentUser, userInitials } from '@/shared/presence/present-users';
import { usePresentUsers } from '@/shared/presence/use-present-users';
import type { EditLease } from './use-edit-lease';

const NOBODY: ActivePresence[] = [];
/** Long enough to cross from the icon or avatar onto its card. */
const HOVER_CLOSE_MS = 150;

export interface LeaseNoticeProps {
  lease: EditLease;
  resourceId: string | null;
  resourceType: PresenceResourceType;
  hasUnsavedContent: () => boolean;
  contentText: () => string;
  onReload: (options?: { discardUnsaved?: boolean }) => Promise<ReloadOutcome>;
  onTakeOver: () => void;
}

type Held = Extract<EditLease, { reason: 'held' }>;

function heldBy(lease: EditLease): Held | null {
  return lease.locked && lease.reason === 'held' ? lease : null;
}

/** The staff user holding the document, once their name is known. */
function useLeaseHolder({
  lease,
  resourceId,
  resourceType,
}: Pick<LeaseNoticeProps, 'lease' | 'resourceId' | 'resourceType'>): PresentUser | undefined {
  const held = heldBy(lease);
  const other = held && !held.ownTab ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );
  return holder;
}

function CopyContentButton({ contentText }: Pick<LeaseNoticeProps, 'contentText'>) {
  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(contentText());
      toast.success('Content copied');
    } catch {
      toast.error('Couldn’t copy your content');
    }
  };

  return (
    <Button className="flex-1" size="sm" variant="secondary" onClick={() => void copyContent()}>
      Copy content
    </Button>
  );
}

/** Why the editor is read-only and the way to edit, as the card both the lock and the avatar open. */
function LeaseCard({
  lease,
  holder,
  resourceType,
  hasUnsavedContent,
  contentText,
  onTakeOver,
  onRequestReload,
}: Omit<LeaseNoticeProps, 'resourceId' | 'onReload'> & {
  holder: PresentUser | undefined;
  /** Omitted where the card cannot offer the reload. */
  onRequestReload?: () => void;
}) {
  const held = heldBy(lease);
  const outdated = lease.locked && lease.reason === 'outdated';
  const unsaved = held !== null && hasUnsavedContent();
  const who = holder?.name ?? 'Someone else';
  const them = holder ? holder.name.split(' ')[0] : 'them';

  let title = `Taking over this ${resourceType}…`;
  let detail: string | null = null;
  if (outdated) {
    title = `Someone saved a newer version of this ${resourceType}.`;
    detail = 'Your unsaved changes are from an older one.';
  } else if (held) {
    title = held.ownTab
      ? `This ${resourceType} is being edited in another of your tabs.`
      : held.lost
        ? `${who} took over editing this ${resourceType}.`
        : `${who} is editing this ${resourceType}.`;
    if (unsaved) {
      detail = 'Your unsaved changes are still here.';
    } else if (held.raced) {
      detail = held.ownTab
        ? 'It started just before this one, so what you typed here was not kept.'
        : `${holder ? them : 'They'} started just before you, so what you typed was not kept.`;
    } else {
      detail = held.ownTab
        ? 'Editing here makes the other tab read-only.'
        : `Taking over will stop ${them} from editing.`;
    }
  }

  return (
    <Stack data-testid={editorLeaseBanner} gap="sm">
      <Stack gap="xs">
        <Text size="sm" weight="semibold">
          {title}
        </Text>
        {detail ? (
          <Text size="sm" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </Stack>
      {held || outdated ? (
        <Inline className="mt-1" gap="xs">
          {unsaved || outdated ? <CopyContentButton contentText={contentText} /> : null}
          {outdated ? (
            <Button className="flex-1" size="sm" variant="secondary" onClick={onRequestReload}>
              Reload
            </Button>
          ) : (
            <Button className="flex-1" size="sm" variant="secondary" onClick={onTakeOver}>
              {held?.ownTab ? 'Edit here' : 'Take over'}
            </Button>
          )}
        </Inline>
      ) : null}
    </Stack>
  );
}

/**
 * A card that opens while the pointer is over its anchor or over the card, and
 * on a click for touch and keyboard. `open` lets the owner show it unasked.
 */
function HoverCardPopover({
  open,
  onOpenChange,
  anchor,
  align,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The icon or avatar the card hangs from. */
  anchor: ReactNode;
  align: 'start' | 'end';
  children: ReactNode;
}) {
  const closing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);
  const enter = () => {
    clearTimeout(closing.current);
    hovered.current = true;
    onOpenChange(true);
  };
  const leave = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => {
      // Only a card the pointer opened closes when the pointer goes.
      if (hovered.current) {
        hovered.current = false;
        onOpenChange(false);
      }
    }, HOVER_CLOSE_MS);
  };
  const pin = () => {
    clearTimeout(closing.current);
    hovered.current = false;
    onOpenChange(true);
  };
  useEffect(() => () => clearTimeout(closing.current), []);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <span
          className="pointer-events-auto inline-flex shrink-0"
          onClick={pin}
          onPointerEnter={enter}
          onPointerLeave={leave}
        >
          {anchor}
        </span>
      </PopoverAnchor>
      <PopoverContent
        align={align}
        className="w-72 p-4"
        sideOffset={8}
        // The card explains; it must not pull focus out of whatever the writer was reading.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={enter}
        onPointerLeave={leave}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Whether a key press was an attempt to write somewhere that takes no writing. */
function isRefusedTyping(event: KeyboardEvent): boolean {
  if (event.key.length !== 1 || event.key === ' ') {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return target.readOnly;
  }
  return !(target instanceof HTMLElement && target.isContentEditable);
}

/**
 * The quiet mark that the editor is read-only: a lock beside the status. Its
 * card says why and offers the way to edit. The card opens by itself when the
 * writer needs to know without asking: the lease was just taken from them,
 * what they typed was put back, their unsaved work is on an older version, or
 * they tried to type.
 */
export function LeaseLock(props: LeaseNoticeProps) {
  const { lease, resourceType, onReload } = props;
  const holder = useLeaseHolder(props);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);

  const held = heldBy(lease);
  const shown = lease.locked && lease.reason !== 'pending';
  const outdated = lease.locked && lease.reason === 'outdated';
  const urgent = outdated || (held?.lost ?? false) || (held?.raced ?? false);
  const [wasUrgent, setWasUrgent] = useState(false);
  if (urgent !== wasUrgent) {
    setWasUrgent(urgent);
    if (urgent) {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!shown) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isRefusedTyping(event)) {
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shown]);

  if (!shown) {
    return null;
  }

  const reload = async () => {
    setConfirming(false);
    setReloading(true);
    const outcome = await onReload({ discardUnsaved: true });
    setReloading(false);
    if (outcome === 'gone' || outcome === 'failed') {
      toast.error(`Couldn’t reload this ${resourceType}`);
    }
  };

  const Icon = outdated
    ? LucideIcon.TriangleAlert
    : held
      ? LucideIcon.Lock
      : LucideIcon.LoaderCircle;
  const label = outdated
    ? 'A newer version was saved'
    : held
      ? 'Read-only'
      : `Taking over this ${resourceType}`;

  return (
    <>
      <HoverCardPopover
        align="start"
        anchor={
          <Button
            aria-label={label}
            className="pointer-events-auto size-6 shrink-0 text-muted-foreground"
            data-testid={editorLeaseLock}
            disabled={reloading}
            size="icon-sm"
            variant="ghost"
          >
            <Icon className={cn('size-3.5!', !held && !outdated && 'animate-spin')} />
          </Button>
        }
        open={open}
        onOpenChange={setOpen}
      >
        <LeaseCard {...props} holder={holder} onRequestReload={() => setConfirming(true)} />
      </HoverCardPopover>
      {/* Beside the card, not in it: a click in the dialog would close the card under it. */}
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
 * The avatar of whoever holds the document, first in the header's avatar row.
 * Hovering it opens the same card as the lock, so taking over sits on the
 * person it is taken from. Nothing is shown for the writer's own other tab.
 */
export function LeaseHolderAvatar({
  className,
  ...props
}: LeaseNoticeProps & { className?: string }) {
  const holder = useLeaseHolder(props);
  const [open, setOpen] = useState(false);
  if (!holder || !heldBy(props.lease)) {
    return null;
  }

  return (
    <HoverCardPopover
      align="end"
      anchor={
        <button
          aria-label={`${holder.name} is editing this ${props.resourceType}`}
          className={cn('pointer-events-auto relative z-10 shrink-0 rounded-full', className)}
          type="button"
        >
          <Avatar
            className="size-7 border-2 border-background"
            colorSeed={holder.name}
            initials={userInitials(holder.name)}
            src={holder.image ?? undefined}
          />
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      <LeaseCard {...props} holder={holder} />
    </HoverCardPopover>
  );
}
