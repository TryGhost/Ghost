import {
  buildTriggerRules,
  getTriggerTierIds,
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
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
import { canCreateLabel, useLabelPicker } from '@/members/api';
import type { LabelSelection, TierSelection } from '@/automations/types';
import { isTierSelectionEmpty, updateFromSelection } from '@/automations/utils/tier-selection';

export type TriggerData = {
  tierQuery: Pick<ReturnType<typeof useBrowseTiers>, 'data' | 'isLoading' | 'isError' | 'refetch'>;
  triggerType: AutomationTriggerRule['trigger_type'];
  rules: readonly AutomationTriggerRule[];
  savedTierIds: readonly string[];
  onUpdate: (trigger: AutomationTrigger) => void;
  // Set for the `member_label_added` trigger, which picks a label instead of tiers (NY-1750).
  labelSelection?: {
    value: LabelSelection;
    onChange: (next: LabelSelection) => void;
    // The chosen label's name, kept by the automation after the label is deleted.
    deletedName?: string;
    // An active automation's label can't change until it's turned off.
    locked?: boolean;
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

// Labels only focus their control, as a forwarded click would open these dropdowns.
const focusControl = (controlId: string) => (event: React.MouseEvent) => {
  event.preventDefault();
  document.getElementById(controlId)?.focus();
};

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
      trigger_rules: buildTriggerRules({
        triggerType: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        tierIds: nextTierIds,
      }),
    });

  return (
    <Stack className="nowheel" gap="sm">
      {/* Not linked with htmlFor, which would carry the label's hover onto the Select. */}
      <Label className="leading-normal font-normal" onClick={focusControl(`${id}-scope`)}>
        Triggered when a new or free member starts:
      </Label>
      <Select
        value={scope}
        onValueChange={(nextScope) => {
          if (nextScope === 'any_paid_tier') {
            trigger.onUpdate({
              trigger_rules: buildTriggerRules({
                triggerType: 'paid_subscription_started',
                scope: nextScope,
              }),
            });
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
    onUpdate({
      trigger_rules: buildTriggerRules({ triggerType: 'paid_subscription_changed', selection }),
    });
  const tiers = (tierQuery.data?.tiers ?? [])
    .filter((tier) => tier.type === 'paid')
    .map((tier) => ({
      id: tier.id,
      name: tier.active ? tier.name : `${tier.name} (archived)`,
      active: tier.active,
    }));
  const fromTiers = [...tiers].sort((a, b) => Number(b.active) - Number(a.active));
  const missingTierLabel = tierQuery.isLoading ? 'Loading tier...' : 'Unavailable tier';
  const fromTierIds = value.from === 'any_paid' ? [] : value.from;
  const toTierIds = value.to === 'downgraded_to_free' ? [] : value.to;
  const toTiers = tiers.filter(
    (tier) => !fromTierIds.includes(tier.id) && (tier.active || toTierIds.includes(tier.id)),
  );
  const notice = tierQueryNotice(tierQuery);
  const emptyMessage = tiers.length === 0 ? 'No paid tiers available.' : 'No tiers found';
  const describedBy = errorMessage ? `${id}-error` : undefined;

  return (
    <Stack aria-labelledby={`${id}-label`} className="nowheel" gap="lg" role="group">
      {/* Not a Label, as it names both fields; sized like the other triggers' field labels. */}
      <Text as="p" className="text-[length:var(--text-control)] leading-normal" id={`${id}-label`}>
        Triggered when a member&apos;s subscription changes:
      </Text>
      <Stack gap="sm">
        <Label
          className="leading-normal font-normal"
          htmlFor={`${id}-from`}
          onClick={focusControl(`${id}-from`)}
        >
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
          options={fromTiers}
          placeholder="Select tiers..."
          standalone={{ value: 'any_paid', label: 'Any paid tier' }}
          value={value.from}
          onChange={(from) => onChange(updateFromSelection(value, from))}
        />
      </Stack>
      <Stack gap="sm">
        <Label
          className="leading-normal font-normal"
          htmlFor={`${id}-to`}
          onClick={focusControl(`${id}-to`)}
        >
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
          options={toTiers}
          placeholder="Select tiers..."
          standalone={{ value: 'downgraded_to_free', label: 'Free' }}
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

// One label, on the "Paid subscription changed" field in its one-choice mode, with a row to create
// the typed label. Picking or creating a label replaces the current one.
const LabelAddedPicker: React.FC<{
  labelSelection: NonNullable<TriggerData['labelSelection']>;
  errorMessage?: string;
}> = ({ labelSelection, errorMessage }) => {
  const id = useId();
  const { value, onChange, deletedName, locked } = labelSelection;
  const selectedSlugs = React.useMemo(() => (value === null ? [] : [value]), [value]);
  const picker = useLabelPicker({
    selectedSlugs,
    onSelectionChange: (slugs) => onChange(slugs.at(-1) ?? null),
  });
  const { isInitialLoad, hasMore, isLoadingMore, loadMore, onSearchChange } = picker.optionSource;
  // In name order: the label source lists the chosen label first, which would move it on each pick.
  // A deleted label stays listed while it's chosen, as archived tiers do.
  const options = React.useMemo(() => {
    const labels = picker.labels.map((label) => ({ id: label.slug, name: label.name }));
    if (deletedName && value !== null && !labels.some((label) => label.id === value)) {
      labels.push({ id: value, name: `${deletedName} (deleted)` });
    }
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  }, [picker.labels, deletedName, value]);

  if (locked) {
    return (
      <Stack className="nowheel" gap="sm">
        <Label className="leading-normal font-normal" htmlFor={`${id}-label`}>
          Triggered when this label is added to a member:
        </Label>
        <InputGroup data-disabled="true">
          <InputGroupInput
            aria-describedby={`${id}-locked`}
            id={`${id}-label`}
            value={options.find((option) => option.id === value)?.name ?? value ?? ''}
            disabled
          />
          <InputGroupAddon align="inline-end">
            <LucideIcon.Lock />
          </InputGroupAddon>
        </InputGroup>
        <Text as="p" id={`${id}-locked`} size="sm" tone="secondary">
          Turn off automation to edit trigger
        </Text>
      </Stack>
    );
  }

  return (
    <Stack className="nowheel" gap="sm">
      <Label className="leading-normal font-normal" htmlFor={`${id}-label`}>
        Triggered when this label is added to a member:
      </Label>
      <TierScopePicker<never>
        createRow={{
          offer: (term) => !picker.isCreating && canCreateLabel(picker.labels, term),
          label: (term) => `Create "${term}"`,
          onCreate: (term) => {
            picker
              .createLabel(term)
              .then((label) => {
                if (label) {
                  onChange(label.slug);
                }
              })
              .catch(() => {
                // Already reported via toast.
              });
          },
        }}
        describedBy={errorMessage ? `${id}-error` : undefined}
        emptyMessage="No labels found"
        inputId={`${id}-label`}
        inputLabel="Label"
        invalid={Boolean(errorMessage)}
        missingTierLabel={
          // Like an archived tier's "Silver (archived)".
          deletedName
            ? `${deletedName} (deleted)`
            : isInitialLoad
              ? 'Loading label...'
              : 'Label deleted'
        }
        notice={isInitialLoad ? <Text size="md">Loading labels...</Text> : undefined}
        options={options}
        optionsHeading="Labels"
        placeholder="Search or create a label..."
        value={selectedSlugs}
        single
        onChange={(next) => onChange(typeof next === 'string' ? null : (next[0] ?? null))}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) {
            loadMore();
          }
        }}
        onSearchChange={onSearchChange}
      />
      {errorMessage && (
        <Text as="p" className="text-destructive" id={`${id}-error`} role="alert" size="sm">
          {errorMessage}
        </Text>
      )}
    </Stack>
  );
};

function getTriggerPresentation(trigger: TriggerData, errorMessage?: string) {
  if (trigger.labelSelection) {
    return {
      title: 'Label added to a member',
      Icon: LucideIcon.Tag,
      content: (
        <LabelAddedPicker errorMessage={errorMessage} labelSelection={trigger.labelSelection} />
      ),
    };
  }

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
