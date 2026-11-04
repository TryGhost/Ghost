import {
  buildTriggerRules,
  getTriggerTierIds,
  subscriptionChangedSelectionFromRules,
} from '@/automations/utils/trigger-rules';
import React, { useId, useState } from 'react';
import type {
  AutomationTrigger,
  AutomationTriggerRule,
} from '@tryghost/admin-x-framework/api/automations';
import type { useBrowseTiers } from '@tryghost/admin-x-framework/api/tiers';
import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  CommandItem,
  type FooterRenderProps,
  Label,
  MultiSelectCombobox,
  type RenderItemProps,
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
import { canCreateLabel, EditRow, useLabelPicker } from '@/members/api';
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
      <Text as="p" id={`${id}-label`} size="sm">
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
          placeholder="Select tiers..."
          standalone={{ value: 'any_paid', label: 'Any paid tier' }}
          tiers={fromTiers}
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
          placeholder="Select tiers..."
          standalone={{ value: 'downgraded_to_free', label: 'Free' }}
          tiers={toTiers}
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

// One label, picked like a single-choice setting (Settings' time zone) with the members label
// filter's inline create, rename and delete. Picking or creating a label replaces the current one.
const LabelAddedPicker: React.FC<{
  labelSelection: NonNullable<TriggerData['labelSelection']>;
  errorMessage?: string;
}> = ({ labelSelection, errorMessage }) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { value, onChange } = labelSelection;
  const selectedSlugs = React.useMemo(() => (value === null ? [] : [value]), [value]);
  const picker = useLabelPicker({
    selectedSlugs,
    onSelectionChange: (slugs) => onChange(slugs.at(-1) ?? null),
  });
  const selectedName = picker.resolvedSelectedLabels[0]?.name ?? value;

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // The list remounts with an empty search, so clear the picker's query to match.
      picker.optionSource.onSearchChange?.('');
      setSearch('');
      setEditingLabelId(null);
    }
  };
  // When a search matches nothing, the Create row is the answer: drop the empty list and its
  // "No labels found" message, and the Create row's divider that would sit under the search box.
  const hidesEmptyList = editingLabelId === null && canCreateLabel(picker.labels, search);

  const renderItem = ({ option, isSelected, onSelect }: RenderItemProps<string>) => {
    const metadataId = option.metadata?.id;
    const labelId =
      typeof metadataId === 'string' || typeof metadataId === 'number' ? String(metadataId) : '';

    if (editingLabelId === labelId && !isSelected) {
      return (
        <EditRow
          key={labelId}
          label={{ id: labelId, name: option.label }}
          onCancel={() => setEditingLabelId(null)}
          onDelete={async (deletedId) => {
            await picker.deleteLabel(deletedId);
            setEditingLabelId(null);
          }}
          onSave={async (editedId, name) => {
            await picker.editLabel(editedId, name);
            setEditingLabelId(null);
          }}
        />
      );
    }

    return (
      <CommandItem
        key={String(option.value)}
        className="group"
        value={option.label}
        onSelect={onSelect}
      >
        <span className="flex-1 truncate">{option.label}</span>
        {isSelected ? (
          <LucideIcon.Check className="size-4 shrink-0 text-primary" />
        ) : (
          <button
            aria-label={`Edit label ${option.label}`}
            className="relative ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setEditingLabelId(labelId);
            }}
          >
            <LucideIcon.Pencil className="absolute size-3 translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
          </button>
        )}
      </CommandItem>
    );
  };

  const renderFooter = ({ searchInput, clearSearch }: FooterRenderProps) => {
    if (!canCreateLabel(picker.labels, searchInput)) {
      return null;
    }
    return (
      <div className="border-t border-border-default p-1">
        <Button
          className="h-8 w-full justify-start gap-2 px-2 text-sm font-normal"
          disabled={picker.isCreating}
          variant="ghost"
          onClick={() =>
            void (async () => {
              try {
                if (await picker.createLabel(searchInput.trim())) {
                  clearSearch();
                  onOpenChange(false);
                }
              } catch {
                // Already reported via toast; keep the typed name for a retry.
              }
            })()
          }
        >
          <LucideIcon.Plus className="size-4" />
          {picker.isCreating ? 'Creating...' : `Create "${searchInput.trim()}"`}
        </Button>
      </div>
    );
  };

  return (
    <Stack className="nowheel" gap="sm">
      <Label className="leading-normal font-normal" htmlFor={`${id}-label`}>
        Triggered when this label is added to a member:
      </Label>
      <Combobox open={open} onOpenChange={onOpenChange}>
        <ComboboxTrigger
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          aria-invalid={Boolean(errorMessage) || undefined}
          id={`${id}-label`}
        >
          <ComboboxValue placeholder={!selectedName}>
            {selectedName ?? 'Select a label'}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="nodrag nopan nowheel">
          <MultiSelectCombobox
            className={
              hidesEmptyList
                ? '[&_[data-slot=command-list]:has([data-slot=command-empty])]:hidden [&_[data-slot=command-list]:has([data-slot=command-empty])+*]:border-t-0'
                : undefined
            }
            footer={renderFooter}
            i18n={{
              searchPlaceholder: 'Search or create a label',
              noResultsFound: 'No labels found',
            }}
            isMultiSelect={false}
            optionSource={picker.optionSource}
            renderItem={renderItem}
            values={selectedSlugs}
            autoCloseOnSelect
            // Picking the current label again keeps it: the trigger always needs one.
            onChange={(slugs) => {
              if (slugs[0]) {
                onChange(slugs[0]);
              }
            }}
            onClose={() => onOpenChange(false)}
            onSearchChange={setSearch}
          />
        </ComboboxContent>
      </Combobox>
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
