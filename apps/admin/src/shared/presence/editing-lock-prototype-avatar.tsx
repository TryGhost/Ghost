import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  LoadingIndicator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@tryghost/shade/components';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import {
  dismissEditingLockPrototypeNotice,
  PROTOTYPE_STAFF,
  takeOverEditingPrototype,
  useEditingLockPrototype,
} from './editing-lock-prototype';
import { userInitials } from './present-users';

interface PrototypePerson {
  id: string;
  name: string;
  image?: string | null;
}

function DemoAvatar({ person }: { person: PrototypePerson }) {
  return (
    <Avatar
      className="size-7 border-2 border-background"
      colorSeed={person.name}
      initials={userInitials(person.name)}
      src={person.image}
    />
  );
}

function PrototypePresenceAvatar({
  person,
  isEditor,
  className,
  testId,
}: {
  person: PrototypePerson;
  isEditor: boolean;
  className?: string;
  testId: string;
}) {
  const message =
    person.id === 'you'
      ? isEditor
        ? 'You’re editing this post.'
        : 'You have this post open.'
      : `${person.name} ${isEditor ? 'is editing this post.' : 'has this post open.'}`;
  return (
    <Tooltip delayDuration={isEditor ? undefined : 0}>
      <TooltipTrigger asChild>
        <span
          aria-label={message}
          className={cn(
            'pointer-events-auto shrink-0 rounded-full',
            !isEditor && 'opacity-50',
            className,
          )}
          data-editor={isEditor}
          data-participant-id={person.id}
          data-testid={testId}
          tabIndex={0}
          data-ignore-select
        >
          <DemoAvatar person={person} />
        </span>
      </TooltipTrigger>
      <TooltipContent variant="white">{message}</TooltipContent>
    </Tooltip>
  );
}

function PrototypeEditorPersonAvatar({
  postId,
  person,
}: {
  postId: string;
  person: PrototypePerson;
}) {
  const snapshot = useEditingLockPrototype(postId);
  const { phase } = snapshot;
  const isEditor = snapshot.editorId === person.id;
  const notice = snapshot.notice && isEditor;
  const editingMessage = `${person.name} is editing this post.`;
  const [open, setOpen] = useState(false);
  const [startedHere, setStartedHere] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);
  const success = startedHere && phase === 'editing';

  const cancelClose = () => clearTimeout(closeTimer.current);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const changeOpen = (next: boolean) => {
    if (!next && phase === 'taking-over') {
      return;
    }
    cancelClose();
    setOpen(next);
    if (!next && notice) {
      dismissEditingLockPrototypeNotice();
    }
    if (!next && success) {
      setStartedHere(false);
    }
  };
  const leave = () => {
    if (!startedHere && !notice) {
      closeTimer.current = setTimeout(() => setOpen(false), 180);
    }
  };

  if (!isEditor && !success) {
    return (
      <PrototypePresenceAvatar
        isEditor={false}
        person={person}
        testId="editing-lock-editor-avatar"
      />
    );
  }

  return (
    <Popover open={notice || open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={
            success
              ? 'Editing takeover complete'
              : notice
                ? `${person.name} has taken over editing this post.`
                : editingMessage
          }
          className={cn(
            'pointer-events-auto shrink-0 rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring',
            !isEditor && 'opacity-50',
          )}
          data-editor={isEditor}
          data-participant-id={person.id}
          data-testid="editing-lock-editor-avatar"
          type="button"
          onClick={(event) => {
            // Hover may already have opened it; clicking should keep it open.
            event.preventDefault();
            cancelClose();
            setOpen(true);
          }}
          onPointerDown={() => {
            hovered.current = false;
          }}
          onPointerEnter={() => {
            hovered.current = true;
            cancelClose();
            setOpen(true);
          }}
          onPointerLeave={leave}
        >
          <DemoAvatar person={person} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Post editing lock"
        className="w-72 max-w-[calc(100vw-2rem)]"
        sideOffset={10}
        onCloseAutoFocus={(event) => {
          if (phase === 'editing') {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={(event) => {
          if (hovered.current || notice) {
            event.preventDefault();
          }
        }}
        onPointerEnter={cancelClose}
        onPointerLeave={leave}
      >
        <Stack gap="md">
          {phase === 'taking-over' ? (
            <Inline aria-live="polite" gap="sm" role="status">
              <LoadingIndicator color="current" size="sm" />
              <Text className="text-base" weight="medium">
                Taking Over
              </Text>
            </Inline>
          ) : success ? (
            <Inline align="start" aria-live="polite" gap="sm" role="status">
              <LucideIcon.CircleCheck className="mt-0.5 size-5 shrink-0 text-state-success" />
              <Text className="text-base" weight="medium">
                You&rsquo;ve taken over editing this post.
              </Text>
            </Inline>
          ) : (
            <>
              <Stack gap="xs">
                <Text className="text-base" weight="medium">
                  {notice ? `${person.name} has taken over editing this post.` : editingMessage}
                </Text>
                <Text className="text-base" tone="secondary">
                  {notice
                    ? 'Take over to continue editing.'
                    : `Taking over will stop ${person.name.split(' ')[0]} from editing.`}
                </Text>
              </Stack>
              <Button
                className="w-full text-base!"
                size="sm"
                variant="secondary"
                onClick={() => {
                  cancelClose();
                  setOpen(true);
                  setStartedHere(true);
                  takeOverEditingPrototype();
                }}
              >
                Take Over
              </Button>
            </>
          )}
        </Stack>
      </PopoverContent>
    </Popover>
  );
}

export function EditingLockPrototypeAvatars({
  postId,
  surface,
  className,
}: {
  postId: string;
  surface: 'editor' | 'list';
  className?: string;
}) {
  const { editorId, present } = useEditingLockPrototype(postId);
  const { data: currentUser } = useCurrentUser();
  const people: PrototypePerson[] = [
    { id: 'you', name: currentUser?.name ?? 'You', image: currentUser?.profile_image },
    ...PROTOTYPE_STAFF.filter((person) => present.includes(person.id)),
  ];
  const ordered = [
    ...people.filter((person) => person.id === editorId),
    ...people.filter((person) => person.id !== editorId),
  ];

  return (
    <Inline
      className={cn('pointer-events-auto isolate shrink-0', className)}
      data-testid={`editing-lock-${surface}-avatars`}
      gap="none"
      data-ignore-select
    >
      {ordered.map((person, index) => (
        <Box
          key={person.id}
          className={cn('relative', index > 0 && '-ml-2')}
          style={{ zIndex: ordered.length - index }}
        >
          {surface === 'editor' && person.id !== 'you' ? (
            <PrototypeEditorPersonAvatar person={person} postId={postId} />
          ) : (
            <PrototypePresenceAvatar
              isEditor={person.id === editorId}
              person={person}
              testId={`editing-lock-${surface}-avatar`}
            />
          )}
        </Box>
      ))}
    </Inline>
  );
}
