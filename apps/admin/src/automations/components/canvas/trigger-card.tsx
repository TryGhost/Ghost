import React, { useEffect, useId, useRef, useState } from 'react';
import type { AutomationTrigger } from '@tryghost/admin-x-framework/api/automations';
import { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  Button,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  inputSurface,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { AutomationCard, AutomationCardHeader } from './automation-card';

export type TriggerData = {
  scope: AutomationTrigger['trigger_tier_scope'];
  tierIds: readonly string[];
  savedTierIds: readonly string[];
  onUpdate: (trigger: AutomationTrigger) => void;
};

const PaidTierPicker: React.FC<{ trigger: TriggerData; errorMessage?: string }> = ({
  trigger,
  errorMessage,
}) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const dismissedOutside = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const dismissOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !anchor.current?.contains(event.target) &&
        !content.current?.contains(event.target)
      ) {
        dismissedOutside.current = true;
        setOpen(false);
      }
    };
    // React Flow consumes canvas events before Radix can dismiss the popover.
    document.addEventListener('pointerdown', dismissOutside, true);
    return () => document.removeEventListener('pointerdown', dismissOutside, true);
  }, [open]);

  const { data, isLoading, isError, refetch } = useBrowseTiers({
    searchParams: { filter: 'type:paid', limit: 'all' },
    defaultErrorHandler: false,
  });
  const tiers = (data?.tiers ?? []).filter(
    (tier) =>
      tier.type === 'paid' &&
      (tier.active || trigger.savedTierIds.includes(tier.id) || trigger.tierIds.includes(tier.id)),
  );
  const tierName = (tier: (typeof tiers)[number]) =>
    tier.active ? tier.name : `${tier.name} (archived)`;
  const selected = trigger.tierIds.map((tierId) => {
    const tier = tiers.find((item) => item.id === tierId);
    if (tier) {
      return tierName(tier);
    }
    return isLoading ? 'Loading tier...' : 'Unavailable tier';
  });
  const allPaid = trigger.scope === 'all_paid';

  const renderTiers = () => {
    if (isLoading) {
      return <Text size="md">Loading tiers...</Text>;
    }
    if (isError) {
      return (
        <Stack gap="sm">
          <Text size="md">Could not load tiers.</Text>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </Stack>
      );
    }
    if (tiers.length === 0) {
      return <Text size="md">No paid tiers available.</Text>;
    }
    return tiers.map((tier) => (
      <Inline key={tier.id} className={cn(!tier.active && 'text-muted-foreground')} gap="sm">
        <Checkbox
          checked={trigger.tierIds.includes(tier.id)}
          id={`${id}-${tier.id}`}
          onCheckedChange={(checked) =>
            trigger.onUpdate({
              trigger_tier_scope: 'selected_paid',
              trigger_tier_ids:
                checked === true
                  ? [...trigger.tierIds, tier.id]
                  : trigger.tierIds.filter((tierId) => tierId !== tier.id),
            })
          }
        />
        <label htmlFor={`${id}-${tier.id}`}>{tierName(tier)}</label>
      </Inline>
    ));
  };

  return (
    <Stack gap="sm">
      <Text as="p" id={`${id}-label`} size="md">
        Triggered when someone signs up or upgrades to:
      </Text>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={anchor}
            aria-describedby={errorMessage ? `${id}-error` : undefined}
            aria-invalid={Boolean(errorMessage)}
            aria-label="Choose tiers"
            className={cn(inputSurface('self'), 'h-9 w-full px-3 text-left text-base')}
            type="button"
          >
            <span
              className={cn(
                'block truncate',
                !allPaid && !selected.length && 'text-muted-foreground',
              )}
            >
              {allPaid ? 'Any paid tier' : selected.join(', ') || 'Choose tiers'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          ref={content}
          align="start"
          aria-labelledby={`${id}-label`}
          className="nodrag nopan nowheel w-(--radix-popover-trigger-width) p-3"
          updatePositionStrategy="always"
          onCloseAutoFocus={(event) => {
            if (dismissedOutside.current) {
              event.preventDefault();
            }
            dismissedOutside.current = false;
          }}
        >
          <Stack gap="md">
            <RadioGroup
              aria-label="Paid tier scope"
              value={trigger.scope ?? undefined}
              onValueChange={(scope) => {
                if (scope !== 'all_paid' && scope !== 'selected_paid') {
                  return;
                }
                switch (scope) {
                  case 'all_paid':
                    trigger.onUpdate({ trigger_tier_scope: scope, trigger_tier_ids: null });
                    break;
                  case 'selected_paid':
                    trigger.onUpdate({ trigger_tier_scope: scope, trigger_tier_ids: [] });
                    break;
                  default: {
                    const _exhaustive: never = scope;
                    throw new Error(`Unknown paid tier scope: ${String(_exhaustive)}`);
                  }
                }
              }}
            >
              <Inline gap="sm">
                <RadioGroupItem id={`${id}-all`} value="all_paid" />
                <label htmlFor={`${id}-all`}>Any paid tier</label>
              </Inline>
              <Inline gap="sm">
                <RadioGroupItem id={`${id}-selected`} value="selected_paid" />
                <label htmlFor={`${id}-selected`}>Select paid tiers</label>
              </Inline>
            </RadioGroup>
            {!allPaid && (
              <Stack className="ml-6 max-h-64 overflow-y-auto" gap="md">
                {renderTiers()}
              </Stack>
            )}
          </Stack>
        </PopoverContent>
      </Popover>
      {errorMessage && (
        <Text as="p" className="text-destructive" id={`${id}-error`} role="alert" size="sm">
          {errorMessage}
        </Text>
      )}
    </Stack>
  );
};

export const TriggerCard: React.FC<
  React.PropsWithChildren<{
    trigger: TriggerData;
    errorMessage?: string;
    onInteract?: () => void;
  }>
> = ({ trigger, errorMessage, onInteract, children }) => {
  let paid: boolean;
  switch (trigger.scope) {
    case 'all_paid':
    case 'selected_paid':
      paid = true;
      break;
    case 'free':
    case null:
      paid = false;
      break;
    default: {
      const _exhaustive: never = trigger.scope;
      throw new Error(`Unknown automation trigger scope: ${String(_exhaustive)}`);
    }
  }
  const title = paid ? 'Paid subscription starts' : 'Member signs up';
  return (
    <AutomationCard
      aria-label={title}
      className="nodrag nopan w-[400px]"
      gap="xl"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocusCapture={onInteract}
      onPointerDownCapture={onInteract}
    >
      <AutomationCardHeader
        icon={
          paid ? (
            <LucideIcon.CreditCard className="size-4" />
          ) : (
            <LucideIcon.UserPlus className="size-4" />
          )
        }
        iconClassName="p-2.5 text-foreground"
        title={title}
      />
      {paid ? (
        <PaidTierPicker errorMessage={errorMessage} trigger={trigger} />
      ) : (
        <Text as="p" size="md" tone="secondary">
          Triggered when someone signs up as a free member.
        </Text>
      )}
      {children}
    </AutomationCard>
  );
};
