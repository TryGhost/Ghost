import { cn, LucideIcon } from '@tryghost/shade/utils';
import { useCallback, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { escapeNqlString } from '@tryghost/nql-string';
import { useBrowseTags, type Tag } from '@tryghost/admin-x-framework/api/tags';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import {
  canCreateTag,
  isInternalTag,
  normalizeTagName,
  sameTag,
  sortTagsByName,
  tagKey,
  tagName,
  type PickedTag,
  type TagLike,
} from '@/shared/tags/tag-selection';

const SEARCH_DEBOUNCE_MS = 250;
const TAG_PAGE_LIMIT = '100';

interface TagPickerProps {
  selected: ReadonlyArray<TagLike>;
  onAdd: (tag: PickedTag) => void;
  onRemove: (key: string) => void;
  /** The accessible name of the field and of the list it opens. */
  inputLabel: string;
  /** Ties the input to a visible label the caller renders. */
  inputId?: string;
  /** Leaves the selected tags out of the list rather than listing them ticked. */
  hideSelected?: boolean;
  /** Holds the read until the list is first opened, so a field never opened reads nothing. */
  deferSearch?: boolean;
  requestOptions?: { sessionExpiryRedirect?: boolean };
  defaultErrorHandler?: boolean;
  /** Reports what is typed, for a caller that must know there is work to lose. */
  onSearchChange?: (search: string) => void;
  maxLength?: number;
  testIds?: { field?: string; input?: string; list?: string; chip?: string };
}

/**
 * The tag picker, shared by the editor's settings sidebar and the posts list's
 * bulk "Add tags": the site's tags read from the server as the writer types,
 * with what is typed offered as a new tag when nothing already carries it.
 */
export function TagPicker({
  selected,
  onAdd,
  onRemove,
  inputLabel,
  inputId,
  hideSelected = false,
  deferSearch = false,
  requestOptions,
  defaultErrorHandler,
  onSearchChange,
  maxLength,
  testIds,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const term = normalizeTagName(search);
  const [debouncedTerm] = useDebounce(term, SEARCH_DEBOUNCE_MS);

  const { data, isFetching } = useBrowseTags({
    filter: {},
    enabled: deferSearch ? open : undefined,
    defaultErrorHandler,
    requestOptions,
    searchParams: {
      limit: TAG_PAGE_LIMIT,
      order: 'name asc',
      ...(debouncedTerm ? { filter: `tags.name:~${escapeNqlString(debouncedTerm)}` } : {}),
    },
  });
  const tags = data?.tags ?? [];
  // Held back until the server has answered for what is typed, or a term still
  // being searched would offer to create a tag that already exists.
  const searchSettled = !isFetching && term === debouncedTerm;

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  return (
    <ChipPicker<Tag, TagLike>
      chipVariant={(tag) => (isInternalTag(tag) ? 'default' : 'secondary')}
      createRow={{
        offer: (typed, offered) => searchSettled && canCreateTag(typed, offered, selected),
        render: (typed) => (
          <>
            <LucideIcon.Plus className="size-4 shrink-0" />
            <span className="truncate">Create “{typed}”</span>
          </>
        ),
        onSelect: (typed) => onAdd({ name: typed }),
      }}
      emptyMessage="No tags found"
      getKey={tagKey}
      getLabel={tagName}
      hideSelected={hideSelected}
      inputId={inputId}
      inputLabel={inputLabel}
      // Names are not unique, so what makes a row a chip is the id when both carry one.
      isChosen={(tag, chip) => sameTag(chip, tag)}
      matches={(tag, typed) => tagName(tag).toLowerCase().includes(typed.toLowerCase())}
      maxLength={maxLength}
      normalizeTerm={normalizeTagName}
      options={sortTagsByName(tags)}
      placeholder="Select or enter tags..."
      renderOption={(tag, { chosen }) => (
        <>
          <span className={cn('truncate', isInternalTag(tag) && 'font-medium')}>{tag.name}</span>
          {/* Names are not unique; the slug is what tells two of them apart. */}
          <span className="ms-auto truncate font-mono text-xs text-muted-foreground">
            {tag.slug}
          </span>
          {chosen && <LucideIcon.Check className="size-4 shrink-0 text-primary" />}
        </>
      )}
      selected={selected}
      testIds={{
        field: testIds?.field ?? 'tag-picker',
        input: testIds?.input,
        list: testIds?.list,
        chip: testIds?.chip,
      }}
      onAdd={(tag) => onAdd({ id: tag.id, name: tag.name, slug: tag.slug })}
      onOpenChange={setOpen}
      onRemove={onRemove}
      onSearchChange={handleSearchChange}
    />
  );
}
