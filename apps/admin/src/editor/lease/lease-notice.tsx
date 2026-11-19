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
  Banner,
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  editorLeaseAvatar,
  editorLeaseCard,
  editorLeaseOutdated,
  editorLeaseReloadConfirm,
} from '@tryghost/test-data/selectors/editor';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';
import type { ReloadOutcome } from '@/editor/session/use-editor-session';
import type { ActivePresence, PresenceResourceType } from '@/shared/presence/presence-api';
import { type PresentUser, userInitials } from '@/shared/presence/present-users';
import { usePresentUsers } from '@/shared/presence/use-present-users';
import type { EditLease } from './use-edit-lease';

const NOBODY: ActivePresence[] = [];
/** Long enough to cross from the avatar onto its card. */
const HOVER_CLOSE_MS = 150;

type Held = Extract<EditLease, { reason: 'held' }>;

function heldBy(lease: EditLease): Held | null {
  return lease.locked && lease.reason === 'held' ? lease : null;
}

function CopyContentButton({
  contentText,
  className,
}: {
  contentText: () => string;
  className?: string;
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
    <Button className={className} size="sm" variant="secondary" onClick={() => void copyContent()}>
      Copy content
    </Button>
  );
}

export interface LeaseAvatarProps {
  lease: EditLease;
  resourceId: string | null;
  resourceType: PresenceResourceType;
  /** The writer, whose own avatar stands for their other tab. */
  currentUser?: { name: string; profile_image?: string | null };
  hasUnsavedContent: () => boolean;
  contentText: () => string;
  onTakeOver: () => void;
  className?: string;
}

/** Why the editor is read-only and the way to edit. */
function LeaseCard({
  lease,
  holder,
  resourceType,
  hasUnsavedContent,
  contentText,
  onTakeOver,
}: Pick<
  LeaseAvatarProps,
  'lease' | 'resourceType' | 'hasUnsavedContent' | 'contentText' | 'onTakeOver'
> & { holder: PresentUser | undefined }) {
  const held = heldBy(lease);
  const unsaved = held !== null && hasUnsavedContent();
  const who = holder?.name ?? 'Someone else';
  const them = holder ? holder.name.split(' ')[0] : 'them';

  let title = `Taking over this ${resourceType}…`;
  let detail: string | null = null;
  if (held) {
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
    <Stack data-testid={editorLeaseCard} gap="sm">
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
      {held ? (
        <Inline className="mt-1" gap="xs">
          {unsaved ? <CopyContentButton className="flex-1" contentText={contentText} /> : null}
          <Button className="flex-1" size="sm" variant="secondary" onClick={onTakeOver}>
            {held.ownTab ? 'Edit here' : 'Take over'}
          </Button>
        </Inline>
      ) : null}
    </Stack>
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
 * The one mark that the editor is read-only: the avatar of whoever is editing,
 * with a lock on it, first in the header's avatar row. The writer's own avatar
 * stands for their other tab. Its card says why and offers the way to edit,
 * and opens on hover, on a click, and by itself when the writer needs to know
 * without asking: the lease was just taken from them, what they typed was put
 * back, or they tried to type.
 */
export function LeaseAvatar({ className, ...props }: LeaseAvatarProps) {
  const { lease, resourceId, resourceType, currentUser } = props;
  const held = heldBy(lease);
  const other = held && !held.ownTab ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);

  const taking = lease.locked && lease.reason === 'taking';
  const shown = held !== null || taking;
  const urgent = (held?.lost ?? false) || (held?.raced ?? false);
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

  useEffect(() => () => clearTimeout(closing.current), []);

  if (!shown) {
    return null;
  }

  const enter = () => {
    clearTimeout(closing.current);
    hovered.current = true;
    setOpen(true);
  };
  const leave = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => {
      // Only a card the pointer opened closes when the pointer goes.
      if (hovered.current) {
        hovered.current = false;
        setOpen(false);
      }
    }, HOVER_CLOSE_MS);
  };
  const pin = () => {
    clearTimeout(closing.current);
    hovered.current = false;
    setOpen(true);
  };

  // Someone else's tab shows them; the writer's own other tab, or a takeover under way, shows the writer.
  const person: { name: string; image?: string | null } | undefined = other
    ? holder
    : currentUser && { name: currentUser.name, image: currentUser.profile_image };
  const label = taking
    ? `Taking over this ${resourceType}`
    : held?.ownTab
      ? `This ${resourceType} is being edited in another of your tabs`
      : `${holder?.name ?? 'Someone else'} is editing this ${resourceType}`;
  const Badge = taking ? LucideIcon.LoaderCircle : LucideIcon.Lock;
  let face: ReactNode = (
    <Inline
      align="center"
      className="size-7 rounded-full border-2 border-background bg-muted"
      justify="center"
    >
      <LucideIcon.User className="size-3.5 text-muted-foreground" />
    </Inline>
  );
  if (person) {
    face = (
      <Avatar
        className="size-7 border-2 border-background"
        colorSeed={person.name}
        initials={userInitials(person.name)}
        src={person.image ?? undefined}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          aria-label={label}
          className={cn('pointer-events-auto relative z-10 shrink-0 rounded-full', className)}
          data-testid={editorLeaseAvatar}
          type="button"
          onClick={pin}
          onPointerEnter={enter}
          onPointerLeave={leave}
        >
          {face}
          <Inline
            align="center"
            aria-hidden="true"
            className="absolute -right-1 -bottom-1 size-4 rounded-full border border-background bg-foreground text-background"
            justify="center"
          >
            <Badge className={cn('size-2.5', taking && 'animate-spin')} strokeWidth={2.5} />
          </Inline>
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="w-72 p-4"
        sideOffset={8}
        // The card explains; it must not pull focus out of whatever the writer was reading.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={enter}
        onPointerLeave={leave}
      >
        <LeaseCard {...props} holder={holder} />
      </PopoverContent>
    </Popover>
  );
}

export interface LeaseOutdatedNoticeProps {
  lease: EditLease;
  resourceType: PresenceResourceType;
  contentText: () => string;
  onReload: (options?: { discardUnsaved?: boolean }) => Promise<ReloadOutcome>;
}

/**
 * Says that the tab's unsaved work is on a version someone has since saved
 * over, above the header where the other notices about versions sit. Reloading
 * here always discards unsaved work, so it always asks first.
 */
export function LeaseOutdatedNotice({
  lease,
  resourceType,
  contentText,
  onReload,
}: LeaseOutdatedNoticeProps) {
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);
  if (!lease.locked || lease.reason !== 'outdated') {
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

  return (
    <>
      <Banner
        className="mx-4 mt-3 shrink-0"
        data-testid={editorLeaseOutdated}
        role="status"
        size="sm"
        variant="warning"
      >
        <Inline align="center" gap="sm" justify="center" wrap>
          <Text as="div" className="text-center text-base">
            <strong>Someone saved a newer version of this {resourceType}.</strong> Your unsaved
            changes are from an older one.
          </Text>
          <Inline align="center" gap="sm" justify="center">
            <Button
              className="bg-background"
              disabled={reloading}
              size="sm"
              variant="outline"
              onClick={() => setConfirming(true)}
            >
              Reload
            </Button>
            <CopyContentButton contentText={contentText} />
          </Inline>
        </Inline>
      </Banner>
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
