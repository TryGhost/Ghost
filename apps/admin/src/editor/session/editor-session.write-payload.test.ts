import { describe, expect, it } from 'vitest';
import { LOADED_AT } from '@/editor/session/__test-utils__/session-harness';
import type { EditorCreatePayload, EditorEditPayload } from './editor-session';

describe('write payload', () => {
  it('refuses a key the write contract does not carry', () => {
    const payload: EditorCreatePayload = {
      title: 'Hello',
      // @ts-expect-error a misspelled field is not part of the write contract
      custom_excerptt: 'A summary',
    };

    expect(payload.title).toBe('Hello');
  });

  it('refuses a value the field does not hold', () => {
    const payload: EditorCreatePayload = {
      title: 'Hello',
      // @ts-expect-error `featured` is a boolean
      featured: 'yes',
    };

    expect(payload.title).toBe('Hello');
  });

  it('carries the identity an update needs', () => {
    const payload: EditorEditPayload = {
      title: 'Hello',
      id: 'abc123',
      updated_at: LOADED_AT,
    };

    expect(payload).toMatchObject({ id: 'abc123', updated_at: LOADED_AT });
  });

  it('requires both the id and collision token for an update', () => {
    // @ts-expect-error an update must identify the post
    const withoutId: EditorEditPayload = { title: 'Hello', updated_at: LOADED_AT };
    // @ts-expect-error an update must carry its collision token
    const withoutToken: EditorEditPayload = { title: 'Hello', id: 'abc123' };
    const nullToken: EditorEditPayload = {
      title: 'Hello',
      id: 'abc123',
      // @ts-expect-error null would bypass the server's collision check
      updated_at: null,
    };

    expect(withoutId.id).toBeUndefined();
    expect(withoutToken.updated_at).toBeUndefined();
    expect(nullToken.updated_at).toBeNull();
  });
});
