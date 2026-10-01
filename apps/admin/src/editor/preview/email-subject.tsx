import { useId, useState } from 'react';
import { Input } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { postPreviewEmailSubject } from '@tryghost/test-data/selectors/editor';
import type { SaveError } from '@/editor/engine/save-engine';
import { describeSaveError } from '@/editor/publish/completion-message';
import {
  EMAIL_SUBJECT_MAX,
  EMAIL_SUBJECT_TOO_LONG,
  overLength,
} from '@/editor/session/settings-fields';

// Ember's placeholder is the title truncated to 40 characters, ellipsis included.
const PLACEHOLDER_MAX = 40;
const ELLIPSIS = '...';

function placeholderFor(title: string): string {
  const characters = Array.from(title);
  const kept = PLACEHOLDER_MAX - ELLIPSIS.length;
  return characters.length > kept ? `${characters.slice(0, kept).join('')}${ELLIPSIS}` : title;
}

/** The session's `email_subject` settings field, staged as the writer types and committed on blur. */
export interface EmailSubjectEditor {
  /** The custom subject; null sends the email under the title. */
  value: string | null;
  /** The post title, which the email is sent under while there is no custom subject. */
  fallback: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  /** The session's failed save, reported until the writer edits past it. */
  saveError: SaveError | null;
  onChange: (value: string | null) => void;
  onCommit: () => void;
}

export function EmailSubject({ editor }: { editor: EmailSubjectEditor }) {
  const errorId = useId();
  const [editedPast, setEditedPast] = useState<SaveError | null>(null);
  const validationError = overLength(editor.value, EMAIL_SUBJECT_MAX)
    ? EMAIL_SUBJECT_TOO_LONG
    : null;
  const saveError =
    editor.saveError && editor.saveError !== editedPast
      ? describeSaveError(editor.saveError).message
      : null;
  const error = validationError ?? saveError;

  const commit = () => {
    if (validationError) {
      return;
    }
    // A cleared subject is no subject, so the email goes out under the title again.
    if (editor.value === '') {
      editor.onChange(null);
    }
    editor.onCommit();
  };

  return (
    <Stack className="min-w-0 flex-1" gap="xs">
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        aria-label="Email subject"
        className="min-w-0"
        data-testid={postPreviewEmailSubject}
        placeholder={placeholderFor(editor.fallback)}
        value={editor.value ?? editor.fallback}
        onBlur={commit}
        onChange={(event) => {
          setEditedPast(editor.saveError);
          editor.onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      {error && (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      )}
    </Stack>
  );
}
