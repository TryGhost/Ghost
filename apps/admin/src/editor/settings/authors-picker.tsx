import { useCallback, useRef } from 'react';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import type { User } from '@tryghost/admin-x-framework/api/users';
import {
  settingsAuthorChip,
  settingsAuthorsList,
  settingsAuthorsPicker,
} from '@tryghost/test-data/selectors/editor';
import { ChipPicker } from '@/shared/pickers/chip-picker';
import { authorName, matchesAuthor, toAuthorOption, type AuthorOption } from './authors-options';

export interface AuthorsPickerProps {
  inputId: string;
  describedBy?: string;
  invalid: boolean;
  /** The post's authors, in order. */
  selected: AuthorOption[];
  /** The site's staff, whoever the browse has answered with so far. */
  staff: User[];
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  onChange: (next: AuthorOption[]) => void;
  /** The first open; the staff browse starts here rather than on every editor entry. */
  onOpen: () => void;
}

/**
 * The authors token field: chips for the post's authors and a list of the
 * staff who could join them. Users are never created here, so the list only
 * ever offers people who already exist.
 */
export function AuthorsPicker({
  inputId,
  describedBy,
  invalid,
  selected,
  staff,
  loading,
  loadError,
  onRetry,
  onChange,
  onOpen,
}: AuthorsPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showLoadError = loadError && !loading;

  // Stable: a new handler each render would re-register the shell's document
  // listeners for as long as the list is open.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        onOpen();
      }
    },
    [onOpen],
  );

  return (
    <ChipPicker<User, AuthorOption>
      describedBy={describedBy}
      emptyMessage={loading ? 'Loading authors...' : 'No authors found'}
      getKey={(person) => person.id}
      getLabel={authorName}
      inputId={inputId}
      inputLabel="Authors"
      inputRef={inputRef}
      invalid={invalid}
      matches={matchesAuthor}
      notice={
        showLoadError ? (
          <Stack align="start" className="p-2" gap="sm">
            <Text role="alert" size="sm">
              Couldn’t load authors.
            </Text>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                inputRef.current?.focus();
                onRetry();
              }}
            >
              Retry
            </Button>
          </Stack>
        ) : null
      }
      options={staff}
      placeholder="Select authors..."
      renderOption={(person) => (
        <>
          <span className="truncate">{authorName(person)}</span>
          <span className="ms-auto truncate text-xs text-muted-foreground">{person.email}</span>
        </>
      )}
      selected={selected}
      testIds={{
        field: settingsAuthorsPicker,
        list: settingsAuthorsList,
        chip: settingsAuthorChip,
      }}
      hideSelected
      reopenOnRemove
      onAdd={(person) => onChange([...selected, toAuthorOption(person)])}
      onOpenChange={handleOpenChange}
      onRemove={(key) => onChange(selected.filter((author) => author.id !== key))}
    />
  );
}
