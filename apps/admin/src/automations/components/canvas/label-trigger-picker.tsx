import React, { useId, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { escapeNqlString } from '@tryghost/nql-string';
import { type Label, useBrowseLabelsInfinite } from '@tryghost/admin-x-framework/api/labels';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useDebounce } from 'use-debounce';
import { ChipPicker, OptionLabel } from '@/shared/pickers/chip-picker';

const SEARCH_DEBOUNCE_MS = 250;
const LABEL_PAGE_LIMIT = '100';

type LabelOption = Pick<Label, 'id' | 'name'>;

/**
 * Picks the labels whose addition starts the automation. Sites can have many labels, so the
 * list is searched on the server a page at a time, as the tag picker does, and only read once
 * the list is first opened.
 */
export const LabelTriggerPicker: React.FC<{
  labelIds: readonly string[];
  errorMessage?: string;
  onChange: (labelIds: string[]) => void;
}> = ({ labelIds, errorMessage, onChange }) => {
  const id = useId();
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState('');
  const term = search.trim();
  const [debouncedTerm] = useDebounce(term, SEARCH_DEBOUNCE_MS);
  // Labels picked in this session, so their chips keep a name after the search moves on.
  const [picked, setPicked] = useState<ReadonlyMap<string, LabelOption>>(new Map());

  const browse = useBrowseLabelsInfinite({
    enabled: opened,
    defaultErrorHandler: false,
    placeholderData: keepPreviousData,
    searchParams: {
      limit: LABEL_PAGE_LIMIT,
      order: 'name asc',
      ...(debouncedTerm ? { filter: `name:~${escapeNqlString(debouncedTerm)}` } : {}),
    },
  });
  const labels = browse.data?.labels ?? [];

  // Saved labels aren't necessarily on the first page; read their names by ID.
  const unpickedIds = labelIds.filter((labelId) => !picked.has(labelId));
  const hydrate = useBrowseLabelsInfinite({
    enabled: unpickedIds.length > 0,
    defaultErrorHandler: false,
    placeholderData: keepPreviousData,
    searchParams: { filter: `id:[${unpickedIds.join(',')}]`, limit: 'all' },
  });

  const findLabel = (labelId: string) =>
    picked.get(labelId) ??
    hydrate.data?.labels.find((label) => label.id === labelId) ??
    labels.find((label) => label.id === labelId);
  const selected = labelIds.map((labelId) => ({
    id: labelId,
    // A deleted label stays selected until the trigger is saved without it.
    name:
      findLabel(labelId)?.name ?? (hydrate.isLoading ? 'Loading label...' : 'Unavailable label'),
  }));
  const searchSettled = !browse.isFetching && term === debouncedTerm;

  return (
    <Stack className="nowheel" gap="sm">
      <Text as="p" id={`${id}-description`} size="md" tone="secondary">
        Triggered when any of these labels is added to a member. Checked every 15 minutes.
      </Text>
      <ChipPicker<LabelOption, LabelOption>
        describedBy={errorMessage ? `${id}-description ${id}-error` : `${id}-description`}
        emptyMessage={!term && labels.length === 0 ? 'No labels available.' : 'No labels found'}
        getKey={(label) => label.id}
        getLabel={(label) => label.name}
        inputLabel="Labels"
        invalid={Boolean(errorMessage)}
        matches={(label, typed) => label.name.toLowerCase().includes(typed.toLowerCase())}
        notice={
          browse.isLoading ? (
            <Text size="md">Loading labels...</Text>
          ) : browse.isError && labels.length === 0 ? (
            <Stack gap="sm">
              <Text size="md">Could not load labels.</Text>
              <Button size="sm" variant="outline" onClick={() => void browse.refetch()}>
                Retry
              </Button>
            </Stack>
          ) : undefined
        }
        options={labels}
        placeholder="Select labels..."
        renderOption={(label, { chosen }) => (
          <>
            <OptionLabel>{label.name}</OptionLabel>
            {chosen && (
              <LucideIcon.Check className="ms-auto mt-0.5 size-4 shrink-0 self-start text-primary" />
            )}
          </>
        )}
        selected={selected}
        onAdd={(label) => {
          setPicked((current) => new Map(current).set(label.id, label));
          onChange([...labelIds, label.id]);
        }}
        onEndReached={() => {
          // Paging before the term is searched would page the wrong list.
          if (browse.hasNextPage && searchSettled) {
            void browse.fetchNextPage();
          }
        }}
        onOpenChange={(open) => {
          if (open) {
            setOpened(true);
          }
        }}
        onRemove={(removedId) => onChange(labelIds.filter((labelId) => labelId !== removedId))}
        onSearchChange={setSearch}
      />
      {errorMessage && (
        <Text as="p" className="text-destructive" id={`${id}-error`} role="alert" size="sm">
          {errorMessage}
        </Text>
      )}
    </Stack>
  );
};
