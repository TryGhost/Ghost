import { useId, useRef, useState } from 'react';
import { Input } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { postPreviewEmailSubject } from '@tryghost/test-data/selectors/editor';
import {
  EMAIL_SUBJECT_MAX,
  EMAIL_SUBJECT_TOO_LONG,
  overLength,
} from '@/editor/session/settings-fields';

/** Subject edits belong to the editor session, including while a save is pending. */
export interface EmailSubjectEditor {
  value: string | null;
  fallback: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
}

export function EmailSubject({ editor }: { editor: EmailSubjectEditor }) {
  const errorId = useId();
  const [saveError, setSaveError] = useState<string | null>(null);
  const editVersion = useRef(0);
  const validationError = overLength(editor.value, EMAIL_SUBJECT_MAX)
    ? EMAIL_SUBJECT_TOO_LONG
    : null;
  const error = validationError ?? saveError;

  const save = async () => {
    if (validationError || !editor.hasUnsavedChanges) {
      return;
    }
    setSaveError(null);
    const version = editVersion.current;
    try {
      await editor.onSave();
    } catch (saveFailure) {
      if (version === editVersion.current) {
        setSaveError(
          saveFailure instanceof Error
            ? saveFailure.message
            : 'Couldn’t save the email subject. Try again.',
        );
      }
    }
  };

  return (
    <Stack className="min-w-0 flex-1" gap="xs">
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        aria-label="Email subject"
        className="h-auto min-w-0 border-transparent bg-transparent px-1 py-0 shadow-none hover:border-control-border"
        data-testid={postPreviewEmailSubject}
        placeholder={editor.fallback}
        value={editor.value ?? editor.fallback}
        onBlur={() => void save()}
        onChange={(event) => {
          editVersion.current += 1;
          setSaveError(null);
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
