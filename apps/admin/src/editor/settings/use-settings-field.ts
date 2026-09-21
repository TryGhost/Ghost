import { type ChangeEvent, useId } from 'react';
import {
  settingsFieldErrorFor,
  type ValidatedSettingsFieldKey,
} from '@/editor/session/settings-fields';
import type { EditorSettingsPort } from './editor-settings-port';

/** The settings keys a plain text field writes: the ones held to a length. */
export type SettingsTextFieldKey = Exclude<ValidatedSettingsFieldKey, 'visibility' | 'tiers'>;

export interface SettingsFieldBinding {
  value: string;
  error: string | null;
  /** Spread onto the Input or Textarea the field is rendered with. */
  fieldProps: {
    id: string;
    value: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
  };
  /** Spread onto the field's `FieldError`, which the field points at while it errors. */
  errorProps: { id: string };
}

/**
 * One text field of the settings panel: staged as the writer types, committed on
 * the blur that ends the edit, and pointed at the rule it breaks. `describedBy`
 * is a hint's id, which the field points at alongside any error.
 */
export function useSettingsField(
  session: EditorSettingsPort,
  key: SettingsTextFieldKey,
  describedBy?: string,
): SettingsFieldBinding {
  const id = useId();
  const errorId = useId();

  const value = session.settings[key] ?? '';
  const error = settingsFieldErrorFor(key, session.settings);
  const describedByIds = [describedBy, error ? errorId : undefined].filter(Boolean).join(' ');

  return {
    value,
    error,
    fieldProps: {
      id,
      value,
      'aria-invalid': !!error,
      'aria-describedby': describedByIds || undefined,
      // A cleared field is stored as no value, the way the excerpt is.
      onChange: (event) => session.stageSettings({ [key]: event.target.value || null }),
      onBlur: session.commitSettings,
    },
    errorProps: { id: errorId },
  };
}
