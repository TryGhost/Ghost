import React, { useId, useState } from 'react';
import type { AutomationTrigger } from '@tryghost/admin-x-framework/api/automations';
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
  scope: AutomationTrigger['trigger_tier_scope'];
  tierIds: readonly string[];
  savedTierIds: readonly string[];
  onUpdate: (trigger: AutomationTrigger) => void;
  // Set for the `paid_subscription_changed` trigger, which replaces the tier scope with From and To.
  tierSelection?: {
    value: TierSelection;
    onChange: (next: TierSelection) => void;
  };
  // Set for the `member_label_added` trigger, which picks labels instead of a tier scope.
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
