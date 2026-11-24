import { useId, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { escapeNqlString } from '@tryghost/nql-string';
import {
  type Label as MemberLabel,
  useBrowseLabelsInfinite,
  useCreateLabel,
  useCacheLabel,
} from '@tryghost/admin-x-framework/api/labels';
import {
  Combobox,
  ComboboxContent,
  ComboboxTrigger,
  ComboboxValue,
  Command,
  CommandCheck,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  FieldError,
  Label,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';

export type SelectedTriggerLabel = {
  name: string | undefined;
  deleted: boolean;
  refresh: () => Promise<unknown>;
};

type LabelTriggerPickerProps = {
  disabled: boolean;
  errorMessage?: string;
  labelId?: string;
  selectedLabel?: SelectedTriggerLabel;
  onChange: (labelId: string) => void;
};

export function LabelTriggerPicker({
  disabled,
  errorMessage,
  labelId,
  selectedLabel,
  onChange,
}: LabelTriggerPickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const cacheLabel = useCacheLabel();
  const name = search.trim();
  const [query] = useDebounce(name, 250);
  const labels = useBrowseLabelsInfinite({
    enabled: open,
    defaultErrorHandler: false,
    staleTime: 0,
    searchParams: {
      limit: '50',
      order: 'name asc',
      ...(query ? { filter: `name:~${escapeNqlString(query)}` } : {}),
    },
  });
  const create = useCreateLabel();

  const searching = query !== name || (labels.isFetching && !labels.isFetchingNextPage);
  const choices = labels.isSuccess && !searching ? (labels.data?.labels ?? []) : [];
  const canCreate =
    Boolean(name) &&
    !searching &&
    labels.isSuccess &&
    !choices.some((choice) => choice.name.toLowerCase() === name.toLowerCase());

  const selectedName = selectedLabel?.name;
  let displayName = 'Search or create a label...';
  if (selectedLabel?.deleted) {
    displayName = selectedName ? `${selectedName} (deleted)` : 'Label deleted';
  } else if (labelId) {
    displayName = selectedName ?? 'Loading label...';
  }

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next && labelId) {
      void selectedLabel?.refresh();
    }
    if (!next) {
      setSearch('');
      create.reset();
    }
  };

  const choose = (choice: MemberLabel) => {
    cacheLabel(choice);
    onChange(choice.id);
    changeOpen(false);
  };

  return (
    <Stack className="nowheel" gap="sm">
      {/* Not linked with htmlFor, which would carry the label's hover onto the picker. */}
      <Label
        className="leading-normal font-normal"
        id={`${id}-label`}
        onClick={(event) => {
          // Focus the picker without forwarding a click that would open it.
          event.preventDefault();
          document.getElementById(id)?.focus();
        }}
      >
        Triggered when this label is added to a member:
      </Label>
      <Combobox
        open={!disabled && open}
        modal
        onOpenChange={(next) => !create.isPending && changeOpen(next)}
      >
        <ComboboxTrigger
          aria-describedby={
            [disabled && `${id}-locked`, errorMessage && `${id}-error`].filter(Boolean).join(' ') ||
            undefined
          }
          aria-invalid={Boolean(errorMessage) || undefined}
          aria-labelledby={`${id}-label`}
          className={disabled ? '[&>svg:last-child]:hidden' : undefined}
          disabled={disabled}
          id={id}
        >
          <ComboboxValue placeholder={!labelId}>{displayName}</ComboboxValue>
          {disabled && <LucideIcon.Lock aria-hidden="true" className="ml-2 size-4 shrink-0" />}
        </ComboboxTrigger>
        <ComboboxContent className="nodrag nopan nowheel">
          <Command shouldFilter={false}>
            <CommandInput
              aria-label="Search labels"
              disabled={create.isPending}
              placeholder="Search labels..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandGroup className="p-0">
                {choices.map((choice) => (
                  <CommandItem
                    key={choice.id}
                    disabled={create.isPending}
                    value={choice.id}
                    onSelect={() => choose(choice)}
                  >
                    <Text className="truncate">{choice.name}</Text>
                    {choice.id === labelId && <CommandCheck />}
                  </CommandItem>
                ))}
                {labels.isError && !searching && (
                  <CommandItem value="retry-labels" onSelect={() => void labels.refetch()}>
                    Retry loading labels
                  </CommandItem>
                )}
                {labels.isSuccess && labels.hasNextPage && !searching && (
                  <CommandItem
                    disabled={labels.isFetchingNextPage || create.isPending}
                    value="more-labels"
                    onSelect={() => void labels.fetchNextPage()}
                  >
                    {labels.isFetchingNextPage ? 'Loading more labels...' : 'Load more labels'}
                  </CommandItem>
                )}
                {canCreate && (
                  <CommandItem
                    disabled={create.isPending}
                    value="create-label"
                    onSelect={() =>
                      create.mutate(
                        { name },
                        {
                          onSuccess: ({ labels: [created] }) => {
                            if (created) {
                              choose(created);
                            }
                          },
                        },
                      )
                    }
                  >
                    <LucideIcon.Plus className="size-4 shrink-0" />
                    {create.isPending ? 'Creating label...' : `Create “${name}”`}
                  </CommandItem>
                )}
              </CommandGroup>
              {searching && (
                <Text as="p" className="p-2" size="sm" tone="secondary">
                  Loading labels...
                </Text>
              )}
              {!searching && labels.isSuccess && choices.length === 0 && !name && (
                <Text as="p" className="p-2" size="sm" tone="secondary">
                  No labels yet
                </Text>
              )}
              {create.isError && (
                <FieldError className="p-2">Could not create label. Try again.</FieldError>
              )}
            </CommandList>
          </Command>
        </ComboboxContent>
      </Combobox>
      {disabled && (
        <Text as="p" id={`${id}-locked`} size="sm" tone="secondary">
          Turn off automation to edit trigger
        </Text>
      )}
      {errorMessage && <FieldError id={`${id}-error`}>{errorMessage}</FieldError>}
    </Stack>
  );
}
