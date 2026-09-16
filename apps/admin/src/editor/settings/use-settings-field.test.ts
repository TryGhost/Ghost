import type { ChangeEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  META_TITLE_MAX,
  META_TITLE_TOO_LONG,
  OG_TITLE_MAX,
  type ValidatedSettingsFields,
} from '@/editor/session/settings-fields';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { useSettingsField } from './use-settings-field';

const SETTINGS: ValidatedSettingsFields = {
  visibility: 'public',
  tiers: [],
  meta_title: null,
  meta_description: null,
  og_title: null,
  og_description: null,
  twitter_title: null,
  twitter_description: null,
};

function fakeSession(settings: Partial<ValidatedSettingsFields> = {}) {
  return {
    settings: { ...SETTINGS, ...settings },
    stageSettings: vi.fn(),
    commitSettings: vi.fn(),
  } as unknown as EditorSessionHandle & {
    stageSettings: ReturnType<typeof vi.fn>;
    commitSettings: ReturnType<typeof vi.fn>;
  };
}

function change(value: string) {
  return { target: { value } } as ChangeEvent<HTMLInputElement>;
}

describe('useSettingsField', () => {
  it('reads the live value, and a field with no value as empty', () => {
    const empty = renderHook(() => useSettingsField(fakeSession(), 'meta_title'));
    expect(empty.result.current.value).toBe('');
    expect(empty.result.current.fieldProps.value).toBe('');

    const filled = renderHook(() =>
      useSettingsField(fakeSession({ meta_title: 'A title for search' }), 'meta_title'),
    );
    expect(filled.result.current.value).toBe('A title for search');
  });

  it('carries the rule the field breaks, worded as the shared rule words it', () => {
    const { result } = renderHook(() =>
      useSettingsField(fakeSession({ meta_title: 'a'.repeat(META_TITLE_MAX + 1) }), 'meta_title'),
    );

    expect(result.current.error).toBe(META_TITLE_TOO_LONG);
    expect(result.current.fieldProps['aria-invalid']).toBe(true);
  });

  it('points a valid field at its hint alone, and an invalid one at its error too', () => {
    const valid = renderHook(() => useSettingsField(fakeSession(), 'meta_title', 'hint-id'));
    expect(valid.result.current.error).toBeNull();
    expect(valid.result.current.fieldProps['aria-invalid']).toBe(false);
    expect(valid.result.current.fieldProps['aria-describedby']).toBe('hint-id');

    const invalid = renderHook(() =>
      useSettingsField(
        fakeSession({ meta_title: 'a'.repeat(META_TITLE_MAX + 1) }),
        'meta_title',
        'hint-id',
      ),
    );
    const { fieldProps, errorProps } = invalid.result.current;
    expect(fieldProps['aria-describedby']).toBe(`hint-id ${errorProps.id}`);
  });

  it('describes nothing while a field with no hint is valid, and its error once it is not', () => {
    const valid = renderHook(() => useSettingsField(fakeSession(), 'og_title'));
    expect(valid.result.current.fieldProps['aria-describedby']).toBeUndefined();

    const invalid = renderHook(() =>
      useSettingsField(fakeSession({ og_title: 'a'.repeat(OG_TITLE_MAX + 1) }), 'og_title'),
    );
    const { fieldProps, errorProps } = invalid.result.current;
    expect(fieldProps['aria-describedby']).toBe(errorProps.id);
  });

  it('labels the field and its error with ids of their own', () => {
    const { result } = renderHook(() => useSettingsField(fakeSession(), 'twitter_description'));

    expect(result.current.fieldProps.id).toBeTruthy();
    expect(result.current.errorProps.id).toBeTruthy();
    expect(result.current.fieldProps.id).not.toBe(result.current.errorProps.id);
  });

  it('stages what the writer types, and stores a cleared field as no value', () => {
    const session = fakeSession({ meta_description: 'What this post is about' });
    const { result } = renderHook(() => useSettingsField(session, 'meta_description'));

    act(() => {
      result.current.fieldProps.onChange(change('Something else'));
    });
    expect(session.stageSettings).toHaveBeenCalledWith({ meta_description: 'Something else' });

    act(() => {
      result.current.fieldProps.onChange(change(''));
    });
    expect(session.stageSettings).toHaveBeenCalledWith({ meta_description: null });
    expect(session.commitSettings).not.toHaveBeenCalled();
  });

  it('commits on the blur that ends the edit', () => {
    const session = fakeSession();
    const { result } = renderHook(() => useSettingsField(session, 'og_description'));

    act(() => {
      result.current.fieldProps.onBlur();
    });

    expect(session.commitSettings).toHaveBeenCalledTimes(1);
  });
});
