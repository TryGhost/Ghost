import React, { useId } from 'react';
import type {
  AutomationTrigger,
  PaidSubscriptionChangedAutomationTrigger,
  PaidSubscriptionChangedTriggerOptions,
} from '@tryghost/admin-x-framework/api/automations';
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
import { isPaidSubscriptionChangedTrigger } from '@/automations/utils/automation-trigger';

export type TriggerData = {
  tierQuery: Pick<ReturnType<typeof useBrowseTiers>, 'data' | 'isLoading' | 'isError' | 'refetch'>;
  trigger: AutomationTrigger;
  savedTierIds: readonly string[];
  onUpdate: (trigger: AutomationTrigger) => void;
};

const TierChipPicker: React.FC<{
  trigger: TriggerData;
  inputLabel: string;
  selectedIds: readonly string[];
  /** Tiers that can't be chosen here, such as tiers chosen elsewhere. */
  excludedIds?: readonly string[];
  describedBy?: string;
  invalid: boolean;
  onChange: (tierIds: string[]) => void;
}> = ({ trigger, inputLabel, selectedIds, excludedIds = [], describedBy, invalid, onChange }) => {
  const { data, isLoading, isError, refetch } = trigger.tierQuery;
  const tiers = (data?.tiers ?? []).filter(
    (tier) =>
      tier.type === 'paid' &&
      (tier.active || trigger.savedTierIds.includes(tier.id) || selectedIds.includes(tier.id)),
  );
  const tierName = (tier: (typeof tiers)[number]) =>
    tier.active ? tier.name : `${tier.name} (archived)`;
  const selected = selectedIds.map((tierId) => {
    const tier = tiers.find((item) => item.id === tierId);
    return {
      id: tierId,
      name: tier ? tierName(tier) : isLoading ? 'Loading tier...' : 'Unavailable tier',
    };
  });
  const options = tiers
    .filter((tier) => !excludedIds.includes(tier.id))
    .map((tier) => ({ id: tier.id, name: tierName(tier) }));

  return (
    <ChipPicker
      chipClassName={() => 'text-(length:--text-control)'}
      chipVariant={() => 'secondary'}
      describedBy={describedBy}
      emptyMessage={tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found'}
      getKey={(tier) => tier.id}
      getLabel={(tier) => tier.name}
      inputLabel={inputLabel}
      invalid={invalid}
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
      options={options}
      placeholder="Select tiers..."
      renderOption={(tier, { chosen }) => (
        <>
          <span className="truncate">{tier.name}</span>
          {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
        </>
      )}
      selected={selected}
      onAdd={(tier) => onChange([...selectedIds, tier.id])}
      onRemove={(removedId) => onChange(selectedIds.filter((tierId) => tierId !== removedId))}
    />
  );
};

const TriggerError: React.FC<{ id: string; errorMessage?: string }> = ({ id, errorMessage }) =>
  errorMessage ? (
    <Text as="p" className="text-destructive" id={id} role="alert" size="sm">
      {errorMessage}
    </Text>
  ) : null;

const PaidTierPicker: React.FC<{ trigger: TriggerData; errorMessage?: string }> = ({
  trigger,
  errorMessage,
}) => {
  const id = useId();
  const scope = trigger.trigger.trigger_tier_scope;
  const tierIds = trigger.trigger.trigger_tier_ids ?? [];
  const updateTiers = (newTierIds: string[]) =>
    trigger.onUpdate({
      trigger_tier_scope: 'selected_paid',
      trigger_tier_ids: newTierIds,
    });

  return (
    <Stack className="nowheel" gap="sm">
      <Label className="leading-normal font-normal" htmlFor={`${id}-scope`}>
        Triggered when a new or free member starts:
      </Label>
      <Select
        value={scope ?? undefined}
        onValueChange={(newScope) => {
          if (newScope === 'all_paid') {
            trigger.onUpdate({ trigger_tier_scope: newScope, trigger_tier_ids: null });
          } else if (newScope === 'selected_paid') {
            updateTiers([]);
          }
        }}
      >
        <SelectTrigger aria-label="Paid tier scope" id={`${id}-scope`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="nodrag nopan nowheel">
          <SelectItem value="all_paid">Any paid tier</SelectItem>
          <SelectItem value="selected_paid">Specific tier(s)</SelectItem>
        </SelectContent>
      </Select>
      {scope === 'selected_paid' && (
        <TierChipPicker
          describedBy={errorMessage ? `${id}-error` : undefined}
          inputLabel="Tiers"
          invalid={Boolean(errorMessage)}
          selectedIds={tierIds}
          trigger={trigger}
          onChange={updateTiers}
        />
      )}
      <TriggerError errorMessage={errorMessage} id={`${id}-error`} />
    </Stack>
  );
};

type FromOption = PaidSubscriptionChangedTriggerOptions['from'];
type ToOption = PaidSubscriptionChangedTriggerOptions['to'];

const getTierIds = (option: FromOption | ToOption): readonly string[] =>
  option.type === 'specific_tiers' ? option.tier_ids : [];

const PaidSubscriptionChangedPicker: React.FC<{
  trigger: TriggerData;
  triggerOptions: PaidSubscriptionChangedTriggerOptions;
  errorMessage?: string;
}> = ({ trigger, triggerOptions, errorMessage }) => {
  const id = useId();
  const { from, to } = triggerOptions;
  const describedBy = errorMessage ? `${id}-error` : undefined;
  const update = (options: Partial<PaidSubscriptionChangedTriggerOptions>) => {
    const newTrigger: PaidSubscriptionChangedAutomationTrigger = {
      trigger_type: 'paid_subscription_changed',
      trigger_options: { ...triggerOptions, ...options },
      trigger_tier_scope: null,
      trigger_tier_ids: null,
    };
    trigger.onUpdate(newTrigger);
  };

  return (
    <Stack className="nowheel" gap="md">
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-from`}>
          From
        </Label>
        <Select
          value={from.type}
          onValueChange={(type) => {
            if (type === 'any_paid_tier') {
              update({ from: { type } });
            } else if (type === 'specific_tiers') {
              update({ from: { type, tier_ids: [] } });
            }
          }}
        >
          <SelectTrigger aria-label="From" id={`${id}-from`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="nodrag nopan nowheel">
            <SelectItem value="any_paid_tier">Any paid tier</SelectItem>
            <SelectItem value="specific_tiers">Specific tiers</SelectItem>
          </SelectContent>
        </Select>
        {from.type === 'specific_tiers' && (
          <TierChipPicker
            describedBy={describedBy}
            excludedIds={getTierIds(to)}
            inputLabel="From tiers"
            invalid={Boolean(errorMessage) && !from.tier_ids.length}
            selectedIds={from.tier_ids}
            trigger={trigger}
            onChange={(tierIds) => update({ from: { type: 'specific_tiers', tier_ids: tierIds } })}
          />
        )}
      </Stack>
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-to`}>
          To
        </Label>
        <Select
          value={to.type}
          onValueChange={(type) => {
            if (type === 'specific_tiers') {
              update({ to: { type, tier_ids: [] } });
            } else if (type === 'canceled_auto_renew' || type === 'downgraded_to_free') {
              update({ to: { type } });
            }
          }}
        >
          <SelectTrigger aria-label="To" id={`${id}-to`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="nodrag nopan nowheel">
            <SelectItem value="specific_tiers">Specific tiers</SelectItem>
            <SelectItem value="canceled_auto_renew">Canceled auto-renew</SelectItem>
            <SelectItem value="downgraded_to_free">Downgraded to free</SelectItem>
          </SelectContent>
        </Select>
        {to.type === 'specific_tiers' && (
          <TierChipPicker
            describedBy={describedBy}
            excludedIds={getTierIds(from)}
            inputLabel="To tiers"
            invalid={Boolean(errorMessage) && !to.tier_ids.length}
            selectedIds={to.tier_ids}
            trigger={trigger}
            onChange={(tierIds) => update({ to: { type: 'specific_tiers', tier_ids: tierIds } })}
          />
        )}
      </Stack>
      <TriggerError errorMessage={errorMessage} id={`${id}-error`} />
    </Stack>
  );
};

type TriggerKind = 'free_signup' | 'paid_subscription_started' | 'paid_subscription_changed';

const getTriggerKind = (trigger: AutomationTrigger): TriggerKind => {
  if (isPaidSubscriptionChangedTrigger(trigger)) {
    return 'paid_subscription_changed';
  }
  switch (trigger.trigger_tier_scope) {
    case 'all_paid':
    case 'selected_paid':
      return 'paid_subscription_started';
    case 'free':
    case null:
      return 'free_signup';
    default: {
      const _exhaustive: never = trigger;
      throw new Error(`Unknown automation trigger: ${JSON.stringify(_exhaustive)}`);
    }
  }
};

export const TriggerCard: React.FC<
  React.PropsWithChildren<{
    trigger: TriggerData;
    errorMessage?: string;
    onInteract?: () => void;
  }>
> = ({ trigger, errorMessage, onInteract, children }) => {
  let title: string;
  let icon: React.ReactNode;
  let content: React.ReactNode;
  const kind = getTriggerKind(trigger.trigger);
  switch (kind) {
    case 'free_signup':
      title = 'Free member signed up';
      icon = <LucideIcon.UserPlus className="size-4" />;
      content = (
        <Text as="p" size="md" tone="secondary">
          Triggered when someone signs up as a free member
        </Text>
      );
      break;
    case 'paid_subscription_started':
      title = 'Paid subscription started';
      icon = <LucideIcon.CreditCard className="size-4" />;
      content = <PaidTierPicker errorMessage={errorMessage} trigger={trigger} />;
      break;
    case 'paid_subscription_changed':
      title = 'Paid subscription changed';
      icon = <LucideIcon.ArrowRightLeft className="size-4" />;
      content = isPaidSubscriptionChangedTrigger(trigger.trigger) && (
        <PaidSubscriptionChangedPicker
          errorMessage={errorMessage}
          trigger={trigger}
          triggerOptions={trigger.trigger.trigger_options}
        />
      );
      break;
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown automation trigger: ${String(_exhaustive)}`);
    }
  }
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
      <AutomationCardHeader icon={icon} iconClassName="p-2.5 text-foreground" title={title} />
      {content}
      {children}
    </AutomationCard>
  );
};
