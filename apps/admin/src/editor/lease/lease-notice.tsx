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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
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
  /** This tab holds the lease, so the writer's own avatar leads the viewers. */
  editingHere?: boolean;
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
    }
  }

  const actions = held ? (
    <Inline className="mt-1" gap="xs">
      {unsaved ? <CopyContentButton className="flex-1" contentText={contentText} /> : null}
      <Button className="flex-1" size="sm" variant="secondary" onClick={onTakeOver}>
        {held.ownTab ? 'Edit here' : 'Take over'}
      </Button>
    </Inline>
  ) : null;

  return (
    <Stack gap="sm">
      <Stack gap="xs">
        <Inline align="start" gap="sm">
          <LucideIcon.Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <Text size="sm" weight="semibold">
            {title}
          </Text>
        </Inline>
        {detail ? (
          <Text size="sm" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </Stack>
      {actions}
    </Stack>
  );
}

/** The warning belongs to the deliberate takeover, rather than every lock notice. */
export function LeaseTakeoverConfirm({
  lease,
  resourceId,
  resourceType,
  open,
  onOpenChange,
  onTakeOver,
}: Pick<LeaseAvatarProps, 'lease' | 'resourceId' | 'resourceType' | 'onTakeOver'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const held = heldBy(lease);
  const other = held && !held.ownTab ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );

  if (!held) {
    return null;
  }

  const them = holder ? holder.name.split(' ')[0] : 'them';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={EDITOR_CONFIRM_DIALOG_LAYER}
        overlayClassName={EDITOR_CONFIRM_DIALOG_LAYER}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {held.ownTab ? 'Edit in this tab?' : 'Take over editing?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {held.ownTab
              ? 'Editing here will make your other tab read-only, and you may lose unsaved content in that tab.'
              : `Taking over will stop ${them} from editing, and they may lose unsaved content.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onTakeOver}>{held.ownTab ? 'Edit here' : 'Take over'}</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
 * The avatar of whoever is editing, first in the header's avatar row. The writer's
 * own avatar stands for their other tab. Its card says why and offers the way
 * to edit, and opens on hover, on a click, and by itself when the writer needs
 * to know without asking: the lease was just taken from them, what they typed
 * was put back, or they tried to type.
 */
export function LeaseAvatar({ className, ...props }: LeaseAvatarProps) {
  const { lease, resourceId, resourceType, currentUser, editingHere = false } = props;
  const held = heldBy(lease);
  const other = held && !held.ownTab ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);

  const taking = lease.locked && lease.reason === 'taking';
  const shown = held !== null || taking || editingHere;
  const urgent = (held?.lost ?? false) || (held?.raced ?? false);
  const [wasUrgent, setWasUrgent] = useState(false);
  if (urgent !== wasUrgent) {
    setWasUrgent(urgent);
    if (urgent) {
      setOpen(true);
    }
  }
  const [wasEditingHere, setWasEditingHere] = useState(editingHere);
  if (editingHere !== wasEditingHere) {
    setWasEditingHere(editingHere);
    if (editingHere) {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!shown || !lease.locked) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isRefusedTyping(event)) {
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shown, lease.locked]);

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
    : editingHere
      ? `You are editing this ${resourceType}`
      : held?.ownTab
        ? `This ${resourceType} is being edited in another of your tabs`
        : `${holder?.name ?? 'Someone else'} is editing this ${resourceType}`;
  let face: ReactNode = (
    <Inline align="center" className="size-full rounded-full bg-background" justify="center">
      <LucideIcon.User className="size-3.5" />
    </Inline>
  );
  if (person) {
    face = (
      <Avatar
        className="size-full"
        colorSeed={person.name}
        initials={userInitials(person.name)}
        src={person.image ?? undefined}
      />
    );
  }

  const trigger = (
    <button
      aria-label={label}
      className={cn(
        'pointer-events-auto relative z-20 size-7 shrink-0 rounded-full border-2 border-background bg-white text-muted-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring',
        className,
      )}
      data-testid={editingHere ? undefined : editorLeaseAvatar}
      type="button"
      onClick={editingHere ? undefined : pin}
      onPointerEnter={editingHere ? undefined : enter}
      onPointerLeave={editingHere ? undefined : leave}
    >
      {face}
      {taking ? (
        <LucideIcon.LoaderCircle
          aria-hidden="true"
          className="absolute -right-1 -bottom-1 size-3.5 animate-spin rounded-full bg-background"
          strokeWidth={2.5}
        />
      ) : null}
    </button>
  );

  if (editingHere) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>You are editing this {resourceType}.</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      <PopoverContent
        align="center"
        className="w-max max-w-72 p-4"
        data-testid={editorLeaseCard}
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

/** Keeps the reason and takeover controls reachable above disabled settings. */
export function LeaseSettingsNotice(
  props: Pick<
    LeaseAvatarProps,
    'lease' | 'resourceId' | 'resourceType' | 'hasUnsavedContent' | 'contentText' | 'onTakeOver'
  >,
) {
  const { lease, resourceId, resourceType } = props;
  const held = heldBy(lease);
  const other = held && !held.ownTab ? held.userId : null;
  const [holder] = usePresentUsers(
    other && resourceId ? [{ userId: other, resourceId, resourceType, ts: 0 }] : NOBODY,
  );

  if (!lease.locked) {
    return null;
  }

  return (
    <Stack
      className="mx-5 mb-4 rounded-lg border border-border-default bg-surface-elevated p-3"
      gap="sm"
      role="status"
    >
      {held || lease.reason === 'taking' ? (
        <LeaseCard {...props} holder={holder} />
      ) : (
        <Text size="sm" tone="secondary">
          {lease.reason === 'outdated'
            ? 'A newer version was saved elsewhere. Reload the latest version to edit settings.'
            : 'Settings will be available once editing access has been checked.'}
        </Text>
      )}
    </Stack>
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
