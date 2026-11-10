import React, { useEffect, useId } from 'react';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { AutomationCard, AutomationCardHeader } from './automation-card';
import { AutomationCardMenu } from './automation-card-menu';
import { AutomationCardWarning } from './automation-card-warning';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import type { LabelFilterOperator, LabelQuery } from '@/automations/types';
import type { NodeContextMenuEntry } from './nodes';

export type ConditionData = {
  labelQuery: LabelQuery;
  operator: LabelFilterOperator | null;
  labelIds: readonly string[];
  onOperatorChange: (operator: LabelFilterOperator) => void;
  onLabelsChange: (labelIds: string[]) => void;
};

export type ConditionPlacement = 'entry' | 'step';

type OperatorCopy = { value: LabelFilterOperator; label: string; effect: string };

// An entry condition decides who gets into the automation. A step condition decides who
// carries on past the point where it sits.
const COPY: Record<ConditionPlacement, { question: string; operators: readonly OperatorCopy[] }> = {
  entry: {
    question: 'Who can enter this automation',
    operators: [
      {
        value: 'has_any',
        label: 'Only members with any of these labels',
        effect:
          'A member enters only if they have at least one of these labels. They stop early if they later lose all of them.',
      },
      {
        value: 'has_all',
        label: 'Only members with all of these labels',
        effect:
          'A member enters only if they have every one of these labels. They stop early if they later lose any of them.',
      },
      {
        value: 'has_none',
        label: 'Skip members with any of these labels',
        effect:
          'A member with any of these labels does not enter. A member already in the automation stops early if they later get one.',
      },
    ],
  },
  step: {
    question: 'Who continues past this step',
    operators: [
      {
        value: 'has_any',
        label: 'Only members with any of these labels',
        effect:
          'A member continues only if they have at least one of these labels when they reach this step. Otherwise they leave the automation here.',
      },
      {
        value: 'has_all',
        label: 'Only members with all of these labels',
        effect:
          'A member continues only if they have every one of these labels when they reach this step. Otherwise they leave the automation here.',
      },
      {
        value: 'has_none',
        label: 'Stop members with any of these labels',
        effect:
          'A member with any of these labels when they reach this step leaves the automation here. Everyone else continues.',
      },
    ],
  },
};

export const ConditionCard: React.FC<
  React.PropsWithChildren<{
    condition: ConditionData;
    placement?: ConditionPlacement;
    errorMessage?: string;
    menuItems: NodeContextMenuEntry[];
  }>
> = ({ condition, placement = 'entry', errorMessage, menuItems, children }) => {
  const id = useId();
  const { labelQuery, operator, labelIds, onOperatorChange, onLabelsChange } = condition;
  const { labels, isLoading, isError, hasMore, loadMore, refetch } = labelQuery;
  const hasUnloadedSelection = labelIds.some(
    (labelId) => !labels.some((label) => label.id === labelId),
  );

  useEffect(() => {
    if (hasUnloadedSelection && hasMore) {
      loadMore();
    }
  }, [hasUnloadedSelection, hasMore, loadMore]);

  let notice: React.ReactNode;
  if (isLoading) {
    notice = <Text size="md">Loading labels...</Text>;
  } else if (isError) {
    notice = (
      <Stack gap="sm">
        <Text size="md">Could not load labels.</Text>
        <Button size="sm" variant="outline" onClick={refetch}>
          Retry
        </Button>
      </Stack>
    );
  }
  const missingLabelName = isLoading || hasMore ? 'Loading label...' : 'Unavailable label';
  const selected = labelIds.map(
    (labelId) =>
      labels.find((option) => option.id === labelId) ?? { id: labelId, name: missingLabelName },
  );
  const { question, operators } = COPY[placement];
  const selectedOperator = operators.find((option) => option.value === operator);

  return (
    <AutomationCard
      aria-label="Condition"
      className={cn(
        'nodrag nopan w-[400px] text-left',
        errorMessage && 'border-state-warning-fill',
      )}
      gap="xl"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {children}
      <AutomationCardHeader
        actions={
          <Inline gap="xs">
            <AutomationCardWarning message={errorMessage} />
            <AutomationCardMenu label="Condition actions" menuItems={menuItems} />
          </Inline>
        }
        icon={<LucideIcon.ListFilter className="size-4" />}
        iconClassName="p-2.5 text-foreground"
        title="Condition"
      />
      <Stack className="nowheel" gap="lg">
        <Stack gap="sm">
          <Label
            className="leading-normal font-normal"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById(`${id}-operator`)?.focus();
            }}
          >
            {question}:
          </Label>
          <Select
            value={operator ?? ''}
            onValueChange={(next) => onOperatorChange(next as LabelFilterOperator)}
          >
            <SelectTrigger aria-label={question} id={`${id}-operator`}>
              <SelectValue placeholder="Choose a rule..." />
            </SelectTrigger>
            <SelectContent className="nodrag nopan nowheel">
              {operators.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
        {selectedOperator && (
          <Stack gap="sm">
            <Label
              className="leading-normal font-normal"
              htmlFor={`${id}-labels`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(`${id}-labels`)?.focus();
              }}
            >
              Labels
            </Label>
            <ChipPicker
              emptyMessage={labels.length === 0 ? 'No labels available.' : 'No labels found'}
              getKey={(option) => option.id}
              getLabel={(option) => option.name}
              inputId={`${id}-labels`}
              inputLabel="Labels"
              invalid={Boolean(errorMessage)}
              matches={(option, term) => option.name.toLowerCase().includes(term.toLowerCase())}
              notice={notice}
              options={labels}
              placeholder="Select labels..."
              renderOption={(option, { chosen }) => (
                <>
                  <span className="truncate">{option.name}</span>
                  {chosen && <LucideIcon.Check className="ms-auto size-4 shrink-0 text-primary" />}
                </>
              )}
              selected={selected}
              onAdd={(option) => onLabelsChange([...labelIds, option.id])}
              onEndReached={loadMore}
              onRemove={(removedId) =>
                onLabelsChange(labelIds.filter((labelId) => labelId !== removedId))
              }
            />
            <Text as="p" size="sm" tone="secondary">
              {selectedOperator.effect}
            </Text>
          </Stack>
        )}
        {errorMessage && (
          <Text as="p" className="text-destructive" role="alert" size="sm">
            {errorMessage}
          </Text>
        )}
      </Stack>
    </AutomationCard>
  );
};
