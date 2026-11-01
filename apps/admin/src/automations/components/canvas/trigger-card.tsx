import {
  getTriggerTierIds,
  signupTriggerRules,
  selectedPaidTierRules,
  subscriptionChangedRulesFromSelection,
  subscriptionChangedSelectionFromRules,
} from '@/automations/utils/trigger-rules';
import React, { useId } from 'react';
import type {
  AutomationTrigger,
  AutomationTriggerRule,
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
import { TierScopePicker } from './tier-scope-picker';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import type { TierSelection } from '@/automations/types';
import { isTierSelectionEmpty, updateFromSelection } from '@/automations/utils/tier-selection';

export type TriggerData = {
  tierQuery: Pick<ReturnType<typeof useBrowseTiers>, 'data' | 'isLoading' | 'isError' | 'refetch'>;
  triggerType: AutomationTriggerRule['trigger_type'];
  rules: readonly AutomationTriggerRule[];
  savedTierIds: readonly string[];
  onUpdate: (trigger: AutomationTrigger) => void;
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

function getTierOptions({ tierQuery, rules, savedTierIds }: TriggerData) {
  const selectedTierIds = getTriggerTierIds(rules);
  // Offer active tiers, and keep archived tiers that belong to this automation.
  return (tierQuery.data?.tiers ?? [])
    .filter(
      (tier) =>
        tier.type === 'paid' &&
        (tier.active || savedTierIds.includes(tier.id) || selectedTierIds.includes(tier.id)),
    )
    .map((tier) => ({ id: tier.id, name: tier.active ? tier.name : `${tier.name} (archived)` }));
}

const PaidTierPicker: React.FC<{ trigger: TriggerData; errorMessage?: string }> = ({
  trigger,
  errorMessage,
}) => {
  const id = useId();
  const { isLoading } = trigger.tierQuery;
  const tierIds = getTriggerTierIds(trigger.rules);
  const tiers = getTierOptions(trigger);
  const selected = tierIds.map(
    (tierId) =>
      tiers.find((tier) => tier.id === tierId) ?? {
        id: tierId,
        name: isLoading ? 'Loading tier...' : 'Unavailable tier',
      },
  );
  const scope = trigger.rules[0]?.scope ?? 'specific_paid_tier';
  const updateTiers = (nextTierIds: string[]) =>
    trigger.onUpdate({
      trigger_rules: selectedPaidTierRules(nextTierIds),
    });

  return (
    <Stack className="nowheel" gap="sm">
      <Label className="leading-normal font-normal" htmlFor={`${id}-scope`}>
        Triggered when a new or free member starts:
      </Label>
      <Select
        value={scope}
        onValueChange={(nextScope) => {
          if (nextScope === 'any_paid_tier') {
            trigger.onUpdate({ trigger_rules: signupTriggerRules('paid_subscription_started') });
          } else if (nextScope === 'specific_paid_tier') {
            updateTiers([]);
          }
        }}
      >
        <SelectTrigger aria-label="Paid tier scope" id={`${id}-scope`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="nodrag nopan nowheel">
          <SelectItem value="any_paid_tier">Any paid tier</SelectItem>
          <SelectItem value="specific_paid_tier">Specific tier(s)</SelectItem>
        </SelectContent>
      </Select>
      {scope === 'specific_paid_tier' && (
        <ChipPicker
          describedBy={errorMessage ? `${id}-error` : undefined}
          emptyMessage={tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found'}
          getKey={(tier) => tier.id}
          getLabel={(tier) => tier.name}
          inputLabel="Tiers"
          invalid={Boolean(errorMessage)}
          matches={(tier, term) => tier.name.toLowerCase().includes(term.toLowerCase())}
          notice={tierQueryNotice(trigger.tierQuery)}
          options={tiers}
          placeholder="Select tiers..."
          renderOption={(tier, { chosen }) => (
            <>
              <span className="truncate">{tier.name}</span>
              {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
            </>
          )}
          selected={selected}
          onAdd={(tier) => updateTiers([...tierIds, tier.id])}
          onRemove={(removedId) => updateTiers(tierIds.filter((tierId) => tierId !== removedId))}
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

const SubscriptionChangedPicker: React.FC<{ trigger: TriggerData; errorMessage?: string }> = ({
  trigger,
  errorMessage,
}) => {
  const id = useId();
  const { tierQuery, rules, onUpdate } = trigger;
  const value = subscriptionChangedSelectionFromRules(rules);
  const onChange = (selection: TierSelection) =>
    onUpdate({ trigger_rules: subscriptionChangedRulesFromSelection(selection) });
  const tiers = getTierOptions(trigger);
  const missingTierLabel = tierQuery.isLoading ? 'Loading tier...' : 'Unavailable tier';
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
          missingTierLabel={missingTierLabel}
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
          missingTierLabel={missingTierLabel}
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
            Starts when a canceled subscription expires and the member&apos;s status changes to
            free.
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
  switch (trigger.triggerType) {
    case 'paid_subscription_changed':
      return {
        title: 'Paid subscription changed',
        Icon: LucideIcon.ArrowRightLeft,
        content: <SubscriptionChangedPicker errorMessage={errorMessage} trigger={trigger} />,
      };
    case 'paid_subscription_started':
      return {
        title: 'Paid subscription started',
        Icon: LucideIcon.CreditCard,
        content: <PaidTierPicker errorMessage={errorMessage} trigger={trigger} />,
      };
    case 'free_signup':
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
      const _exhaustive: never = trigger.triggerType;
      throw new Error(`Unknown automation trigger type: ${String(_exhaustive)}`);
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
