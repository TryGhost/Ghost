import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import type { PickedTrigger, TriggerOption } from '@/automations/utils/trigger-options';

// The "Select a trigger" card on a new automation's canvas.
export const TriggerPickerCard = React.forwardRef<
  HTMLDivElement,
  { options: readonly TriggerOption[]; onPick: (trigger: PickedTrigger) => void }
>(({ options, onPick }, ref) => (
  <Stack
    ref={ref}
    className="pointer-events-auto w-[400px] max-w-[calc(100%-32px)] rounded-xl border border-border-default bg-surface-elevated p-6 shadow-sm"
    gap="xl"
  >
    <Text weight="semibold">Select a trigger</Text>
    {options.map(([trigger, Icon, title, description]) => (
      <Button
        key={trigger}
        className="-mx-2 h-auto justify-start px-2 text-left whitespace-normal"
        shape="rounded"
        variant="ghost"
        onClick={() => onPick(trigger)}
      >
        <Inline gap="md">
          <Inline className="size-9 shrink-0 rounded-md bg-muted" justify="center">
            <Icon className="size-4" />
          </Inline>
          <Stack gap="none">
            <Text weight="medium">{title}</Text>
            <Text size="sm" tone="secondary">
              {description}
            </Text>
          </Stack>
        </Inline>
      </Button>
    ))}
  </Stack>
));
TriggerPickerCard.displayName = 'TriggerPickerCard';
