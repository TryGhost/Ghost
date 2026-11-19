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
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { takeOverEditingPrototype, useEditingLockPrototype } from './editing-lock-prototype';

const NAME = 'Alex Smith';
const EDITING_MESSAGE = `${NAME} is editing this post.`;

function DemoAvatar() {
  return <Avatar className="size-7 border-2 border-background" colorSeed={NAME} initials="AS" />;
}

export function EditingLockPrototypeListAvatar({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={EDITING_MESSAGE}
          className={cn('pointer-events-auto shrink-0 rounded-full', className)}
          data-testid="editing-lock-list-avatar"
          tabIndex={0}
          data-ignore-select
        >
          <DemoAvatar />
        </span>
      </TooltipTrigger>
      <TooltipContent>{EDITING_MESSAGE}</TooltipContent>
    </Tooltip>
  );
}

export function EditingLockPrototypeEditorAvatar({ postId }: { postId: string }) {
  const { phase } = useEditingLockPrototype(postId);
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
    if (!next && success) {
      setStartedHere(false);
    }
  };
  const leave = () => {
    if (!startedHere) {
      closeTimer.current = setTimeout(() => setOpen(false), 180);
    }
  };

  if (phase === 'editing' && !success) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={success ? 'Editing takeover complete' : EDITING_MESSAGE}
          className="pointer-events-auto shrink-0 rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-focus-ring"
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
          <DemoAvatar />
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
          if (hovered.current) {
            event.preventDefault();
          }
        }}
        onPointerEnter={cancelClose}
        onPointerLeave={leave}
      >
        <Stack className="min-h-24" gap="md" justify="center">
          {phase === 'taking-over' ? (
            <Inline aria-live="polite" gap="sm" role="status">
              <LoadingIndicator color="current" size="sm" />
              <Text weight="medium">Taking Over</Text>
            </Inline>
          ) : success ? (
            <Inline align="start" aria-live="polite" gap="sm" role="status">
              <LucideIcon.CircleCheck className="mt-0.5 size-5 shrink-0 text-state-success" />
              <Text weight="medium">You&rsquo;ve taken over editing this post.</Text>
            </Inline>
          ) : (
            <>
              <Stack gap="sm">
                <Text weight="medium">{EDITING_MESSAGE}</Text>
                <Text size="sm" tone="secondary">
                  Taking over will end their editing session.
                </Text>
              </Stack>
              <Button
                className="self-start"
                onClick={() => {
                  cancelClose();
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
