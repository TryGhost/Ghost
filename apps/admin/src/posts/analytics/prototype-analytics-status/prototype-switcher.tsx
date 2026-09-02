// PROTOTYPE ONLY — not production code. See ./README.md
//
// Floating control for comparing the variants. Picks the treatment, and both
// pipeline dimensions separately, so combinations like "send partly failed AND
// counting is hours behind" can actually be seen. Collapses to a small tab.

import React, { useState } from 'react';
import { Button, Separator } from '@tryghost/shade/components';
import { COUNTING_STATES, EMAIL_DATA_TREATMENTS, SEND_STATES, STATUS_VARIANTS } from './types';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { usePrototypeAnalyticsStatus } from './prototype-context';

const PrototypeSwitcher: React.FC = () => {
  const prototype = usePrototypeAnalyticsStatus();
  const [isOpen, setIsOpen] = useState(true);

  if (!prototype) {
    return null;
  }

  const {
    variant,
    send,
    counting,
    emailData,
    isPlaying,
    isPaused,
    hasPlayback,
    setVariant,
    setSend,
    setCounting,
    setEmailData,
    play,
    pause,
    stop,
  } = prototype;

  // Both demo actions are reachable with the panel shut, because the panel
  // covers the bottom-right of the very page being demonstrated. Playing a send
  // and dropping into a partial failure are the two things worth showing live;
  // everything else is setup, and setup can happen before the panel closes.
  const toggleFailure = () => {
    // Playback drives the send state itself, so it has to yield before a manual
    // pick will hold — otherwise the next tick overwrites it 120ms later.
    pause();
    setSend(send === 'partiallyFailed' ? 'submitted' : 'partiallyFailed');
  };

  const playButton = (
    <Button
      aria-label={isPaused ? 'Resume the send' : 'Play a send'}
      className="size-7 p-0 shadow-lg"
      disabled={isPlaying}
      size="sm"
      variant="outline"
      onClick={play}
    >
      <LucideIcon.Play />
    </Button>
  );

  const pauseButton = (
    <Button
      aria-label="Pause the send"
      className="size-7 p-0 shadow-lg"
      disabled={!isPlaying}
      size="sm"
      variant={isPlaying ? 'secondary' : 'outline'}
      onClick={pause}
    >
      <LucideIcon.Pause />
    </Button>
  );

  const stopButton = (
    <Button
      aria-label="Stop the send"
      className="size-7 p-0 shadow-lg"
      disabled={!hasPlayback}
      size="sm"
      variant="outline"
      onClick={stop}
    >
      <LucideIcon.Square />
    </Button>
  );

  const failureButton = (
    <Button
      aria-label="Toggle a partly failed send"
      aria-pressed={send === 'partiallyFailed'}
      className="size-7 p-0 shadow-lg"
      size="sm"
      variant={send === 'partiallyFailed' ? 'secondary' : 'outline'}
      onClick={toggleFailure}
    >
      <LucideIcon.TriangleAlert />
    </Button>
  );

  if (!isOpen) {
    return (
      <Inline align="center" className="fixed right-6 bottom-6 z-[100]" gap="xs">
        <Button className="shadow-lg" size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <LucideIcon.FlaskConical size={16} strokeWidth={1.5} />
          Prototype
        </Button>
        {playButton}
        {pauseButton}
        {stopButton}
        {failureButton}
      </Inline>
    );
  }

  // The pipeline dimensions do nothing while everything that reads them is off,
  // so they are disabled rather than left looking live. Email data reads them
  // too, which is why it is not enough for the treatment alone to be on.
  // Playback drives these two itself, so they are held while it runs rather
  // than left live for a click that would be overwritten a second later.
  const isPipelineDisabled = (variant === 'off' && emailData === 'off') || isPlaying;

  const row = (
    label: string,
    active: boolean,
    onClick: () => void,
    options: { blurb?: string; disabled?: boolean } = {},
  ) => (
    <Button
      key={label}
      className="h-auto justify-start px-2 py-1.5 text-left"
      disabled={options.disabled}
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      onClick={onClick}
    >
      <Stack gap="none">
        <Text size="sm" weight={active ? 'semibold' : 'regular'}>
          {label}
        </Text>
        {options.blurb && (
          <Text size="2xs" tone="tertiary">
            {options.blurb}
          </Text>
        )}
      </Stack>
    </Button>
  );

  return (
    <Stack
      className="fixed right-6 bottom-6 z-[100] max-h-[85vh] w-[260px] overflow-y-auto rounded-lg border border-border-default bg-surface-elevated-2 p-4 shadow-lg"
      gap="md"
    >
      <Inline align="center" justify="between">
        <Inline align="center" gap="xs">
          <LucideIcon.FlaskConical size={14} strokeWidth={1.5} />
          <Text size="sm" weight="semibold">
            Analytics status
          </Text>
        </Inline>
        <Button
          aria-label="Collapse prototype switcher"
          className="size-6"
          size="icon"
          variant="ghost"
          onClick={() => setIsOpen(false)}
        >
          <LucideIcon.Minus size={14} />
        </Button>
      </Inline>

      <Inline align="center" gap="xs">
        <Button
          className="grow justify-center"
          disabled={isPlaying}
          size="sm"
          variant="outline"
          onClick={play}
        >
          <LucideIcon.Play size={13} />
          {isPaused ? 'Resume' : 'Play a send'}
        </Button>
        <Button
          aria-label="Pause the send"
          className="size-7 shrink-0 p-0"
          disabled={!isPlaying}
          size="sm"
          variant={isPlaying ? 'secondary' : 'outline'}
          onClick={pause}
        >
          <LucideIcon.Pause />
        </Button>
        <Button
          aria-label="Stop the send"
          className="size-7 shrink-0 p-0"
          disabled={!hasPlayback}
          size="sm"
          variant="outline"
          onClick={stop}
        >
          <LucideIcon.Square />
        </Button>
        <Button
          aria-label="Toggle a partly failed send"
          aria-pressed={send === 'partiallyFailed'}
          className="size-7 shrink-0 p-0"
          size="sm"
          variant={send === 'partiallyFailed' ? 'secondary' : 'outline'}
          onClick={toggleFailure}
        >
          <LucideIcon.TriangleAlert />
        </Button>
      </Inline>

      <Stack gap="sm">
        <Text size="2xs" tone="tertiary" weight="medium">
          TREATMENT
        </Text>
        {STATUS_VARIANTS.map((o) => row(o.label, variant === o.value, () => setVariant(o.value)))}
      </Stack>

      <Stack gap="sm">
        <Text size="2xs" tone="tertiary" weight="medium">
          EMAIL DATA
        </Text>
        {EMAIL_DATA_TREATMENTS.map((o) =>
          row(o.label, emailData === o.value, () => setEmailData(o.value)),
        )}
      </Stack>

      <Separator />

      <Stack gap="sm">
        <Text size="2xs" tone="tertiary" weight="medium">
          SENDING
        </Text>
        {SEND_STATES.map((o) =>
          row(o.label, send === o.value, () => setSend(o.value), { disabled: isPipelineDisabled }),
        )}
      </Stack>

      <Stack gap="sm">
        <Text size="2xs" tone="tertiary" weight="medium">
          COUNTING
        </Text>
        {COUNTING_STATES.map((o) =>
          row(o.label, counting === o.value, () => setCounting(o.value), {
            disabled: isPipelineDisabled,
          }),
        )}
      </Stack>
    </Stack>
  );
};

export default PrototypeSwitcher;
