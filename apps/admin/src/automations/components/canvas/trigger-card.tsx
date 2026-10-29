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
import { TierScopePicker } from './tier-scope-picker';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import type { TierSelection } from '@/automations/types';
import { isTierSelectionEmpty, updateFromSelection } from '@/automations/utils/tier-selection';

export type TriggerData = {
  tierQuery: Pick<ReturnType<typeof useBrowseTiers>, 'data' | 'isLoading' | 'isError' | 'refetch'>;
  scope: AutomationTrigger['trigger_tier_scope'];
  tierIds: readonly string[];
  savedTierIds: readonly string[];
  onUpdate: (trigger: AutomationTrigger) => void;
  // Set for the `paid_subscription_changed` trigger, which replaces the tier scope with From and To.
  tierSelection?: {
    value: TierSelection;
    onChange: (next: TierSelection) => void;
  };
};

function tierQueryNotice({ isLoading, isError, refetch }: TriggerData['tierQuery']) {
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
  return undefined;
}

const PaidTierPicker: React.FC<{ trigger: TriggerData; errorMessage?: string }> = ({
  trigger,
  errorMessage,
}) => {
  const id = useId();
  const { data, isLoading } = trigger.tierQuery;
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
          <SelectItem value="selected_paid">Specific tier(s)</SelectItem>
        </SelectContent>
      </Select>
      {trigger.scope === 'selected_paid' && (
        <ChipPicker
          describedBy={errorMessage ? `${id}-error` : undefined}
          emptyMessage={tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found'}
          getKey={(tier) => tier.id}
          getLabel={(tier) => tier.name}
          inputLabel="Tiers"
          invalid={Boolean(errorMessage)}
          matches={(tier, term) => tier.name.toLowerCase().includes(term.toLowerCase())}
          notice={tierQueryNotice(trigger.tierQuery)}
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

const SubscriptionChangedPicker: React.FC<{
  tierSelection: NonNullable<TriggerData['tierSelection']>;
  tierQuery: TriggerData['tierQuery'];
  errorMessage?: string;
}> = ({ tierSelection, tierQuery, errorMessage }) => {
  const id = useId();
  const { value, onChange } = tierSelection;
  const tiers = (tierQuery.data?.tiers ?? [])
    .filter((tier) => tier.type === 'paid' && tier.active)
    .map((tier) => ({ id: tier.id, name: tier.name }));
  const fromTierIds = value.from === 'any_paid' ? [] : value.from;
  const notice = tierQueryNotice(tierQuery);
  const emptyMessage = tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found';
  const describedBy = errorMessage ? `${id}-error` : undefined;

  return (
    <Stack aria-labelledby={`${id}-label`} className="nowheel" gap="lg" role="group">
      <Text as="p" id={`${id}-label`} size="sm">
        Triggered when a member&apos;s subscription changes:
      </Text>
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-from`}>
          From
        </Label>
        <TierScopePicker<'any_paid'>
          describedBy={describedBy}
          emptyMessage={emptyMessage}
          inputId={`${id}-from`}
          inputLabel="From"
          invalid={Boolean(errorMessage) && isTierSelectionEmpty(value.from)}
          notice={notice}
          placeholder="Select tiers..."
          standalone={{ value: 'any_paid', label: 'Any paid tier' }}
          tiers={tiers}
          value={value.from}
          onChange={(from) => onChange(updateFromSelection(value, from))}
        />
      </Stack>
      <Stack gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-to`}>
          To
        </Label>
        <TierScopePicker<'downgraded_to_free'>
          describedBy={describedBy}
          emptyMessage={emptyMessage}
          inputId={`${id}-to`}
          inputLabel="To"
          invalid={Boolean(errorMessage) && isTierSelectionEmpty(value.to)}
          notice={notice}
          placeholder="Select tiers..."
          standalone={{ value: 'downgraded_to_free', label: 'Free' }}
          tiers={tiers.filter((tier) => !fromTierIds.includes(tier.id))}
          value={value.to}
          onChange={(to) => onChange({ ...value, to })}
        />
        {/* A subscription can end long after the member cancels. */}
        {value.to === 'downgraded_to_free' && (
          <Text as="p" size="sm" tone="secondary">
            Members start this automation when their subscription expires, not when they cancel.
          </Text>
        )}
      </Stack>
      {errorMessage && (
        <Text as="p" className="text-destructive" id={`${id}-error`} role="alert" size="sm">
          {errorMessage}
        </Text>
      )}
    </Stack>
  );
};

function getTriggerPresentation(trigger: TriggerData, errorMessage?: string) {
  if (trigger.tierSelection) {
    return {
      title: 'Paid subscription changed',
      Icon: LucideIcon.ArrowRightLeft,
      content: (
        <SubscriptionChangedPicker
          errorMessage={errorMessage}
          tierQuery={trigger.tierQuery}
          tierSelection={trigger.tierSelection}
        />
      ),
    };
  }

  switch (trigger.scope) {
    case 'all_paid':
    case 'selected_paid':
      return {
        title: 'Paid subscription started',
        Icon: LucideIcon.CreditCard,
        content: <PaidTierPicker errorMessage={errorMessage} trigger={trigger} />,
      };
    case 'free':
    case null:
      return {
        title: 'Free member signed up',
        Icon: LucideIcon.UserPlus,
        content: (
          <Text as="p" size="md" tone="secondary">
            Triggered when someone signs up as a free member
          </Text>
        ),
      };
    default: {
      const _exhaustive: never = trigger.scope;
      throw new Error(`Unknown automation trigger scope: ${String(_exhaustive)}`);
    }
  }
}

export const TriggerCard: React.FC<
  React.PropsWithChildren<{
    trigger: TriggerData;
    errorMessage?: string;
    onInteract?: () => void;
  }>
> = ({ trigger, errorMessage, onInteract, children }) => {
  const { title, Icon, content } = getTriggerPresentation(trigger, errorMessage);
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
        icon={<Icon className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title={title}
      />
      {content}
      {children}
    </AutomationCard>
  );
};
