import { describe, expect, it } from 'vitest';
import { record } from '@/editor/session/__test-utils__/session-harness';
import { projectionOf } from '@/editor/session/projection';

describe('projectionOf email subject boundary', () => {
  it.each(['A custom subject', '', null, undefined])(
    'preserves supported subject values (%s)',
    (value) => {
      expect(projectionOf(record({ email_subject: value })).email_subject).toBe(value ?? null);
    },
  );

  it('supports responses without the optional subject field', () => {
    const response = record();
    Reflect.deleteProperty(response, 'email_subject');

    expect(projectionOf(response).email_subject).toBeNull();
  });

  it.each([
    { value: 42 },
    { value: false },
    { value: {} },
    { value: [] },
    { value: ['Unexpected array subject'] },
  ])('uses the title fallback for malformed API subject metadata: $value', ({ value }) => {
    const response = record({ title: 'Original title' });
    // Deliberately violate the compile-time API type, as a malformed JSON response can.
    Reflect.set(response, 'email_subject', value);

    expect(projectionOf(response)).toMatchObject({
      email_subject: null,
      title: 'Original title',
      lexical: response.lexical,
    });
  });
});
