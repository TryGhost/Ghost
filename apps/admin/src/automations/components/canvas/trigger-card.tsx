import React, { useId } from 'react';
import type { AutomationTrigger } from '@tryghost/admin-x-framework/api/automations';
import type { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { ChipPicker } from '@/shared/pickers/chip-picker';

export type TriggerData = {
  tierQuery: Pick<ReturnType<typeof useBrowseTiers>, 'data' | 'isLoading' | 'isError' | 'refetch'>;
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
  const { data, isLoading, isError, refetch } = trigger.tierQuery;
  const tiers = (data?.tiers ?? []).filter(
    (tier) =>
      tier.type === 'paid' &&
      (tier.active || trigger.savedTierIds.includes(tier.id) || trigger.tierIds.includes(tier.id)),
  );
  const tierName = (tier: (typeof tiers)[number]) =>
    tier.active ? tier.name : `${tier.name} (archived)`;
  const selected = trigger.tierIds.map((tierId) => {
    const tier = tiers.find((item) => item.id === tierId);
    return {
      id: tierId,
      name: tier ? tierName(tier) : isLoading ? 'Loading tier...' : 'Unavailable tier',
    };
  });
  const updateTiers = (tierIds: string[]) =>
    trigger.onUpdate({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: tierIds,
    });

  return (
    <Stack className="nowheel" gap="sm">
      <Label className="leading-normal font-normal" htmlFor={`${id}-scope`}>
        Triggered when a new or free member starts:
      </Label>
      <Select
        value={trigger.scope ?? undefined}
        onValueChange={(scope) => {
          if (scope === 'all_paid') {
            trigger.onUpdate({ trigger_tier_scope: scope, trigger_tier_ids: null });
          } else if (scope === 'selected_paid') {
            updateTiers([]);
          }
        }}
      >
        <SelectTrigger aria-label="Paid tier scope" id={`${id}-scope`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="nodrag nopan nowheel">
          <SelectItem value="all_paid">Any paid tier</SelectItem>
          <SelectItem value="selected_paid">Selected tier(s)</SelectItem>
        </SelectContent>
      </Select>
      {trigger.scope === 'selected_paid' && (
        <ChipPicker
          chipClassName={() => 'text-(length:--text-control)'}
          chipVariant={() => 'secondary'}
          describedBy={errorMessage ? `${id}-error` : undefined}
          emptyMessage={tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found'}
          getKey={(tier) => tier.id}
          getLabel={(tier) => tier.name}
          inputLabel="Tiers"
          invalid={Boolean(errorMessage)}
          matches={(tier, term) => tier.name.toLowerCase().includes(term.toLowerCase())}
          notice={
            isLoading ? (
              <Text size="md">Loading tiers...</Text>
            ) : isError ? (
              <Stack gap="sm">
                <Text size="md">Could not load tiers.</Text>
                <Button size="sm" variant="outline" onClick={() => void refetch()}>
                  Retry
                </Button>
              </Stack>
            ) : undefined
          }
          options={tiers.map((tier) => ({ id: tier.id, name: tierName(tier) }))}
          placeholder="Select tiers..."
          renderOption={(tier, { chosen }) => (
            <>
              <span className="truncate">{tier.name}</span>
              {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
            </>
          )}
          selected={selected}
          onAdd={(tier) => updateTiers([...trigger.tierIds, tier.id])}
          onRemove={(removedId) =>
            updateTiers(trigger.tierIds.filter((tierId) => tierId !== removedId))
          }
        />
      )}
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
  const title = paid ? 'Paid subscription started' : 'Free member signed up';
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
