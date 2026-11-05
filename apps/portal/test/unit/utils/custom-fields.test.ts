import { describe, expect, it } from 'vitest';
import {
  SHAPES,
  accept,
  heldValue,
  shaped,
  textOfValue,
  type FieldShape,
  type ShapedField,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from '@tryghost/metafield-types/test/fixtures';
import {
  changedCustomFields,
  customFieldTexts,
  type MemberCustomField,
} from '../../../src/utils/custom-fields';

/** What a write does to what a field of this shape holds, as the members API accepts and applies it. */
function applied<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  held: unknown,
  write: unknown,
): unknown {
  if (write === null) {
    return undefined;
  }
  const acceptance = accept(of, write);
  if (!acceptance.success) {
    throw new Error(`the site would refuse ${JSON.stringify(write)}`);
  }
  return SHAPES[of.shape].apply(heldValue(of, held), acceptance.accepted.value);
}

// Every field type, over the fixtures it declares: the form a member edits starts from what they
// hold, and saving it sends the write that turns what they hold into what it shows.
describe.each(
  ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
)('a %s field on the profile page', (_type, { field, values }) => {
  const writable: MemberCustomField = {
    key: 'sampled',
    name: 'Sample',
    access: { member: 'write' },
    ...field,
  };
  const held = (value: unknown): Record<string, unknown> => ({ sampled: value });

  it('sends nothing when the form is saved untouched', () => {
    for (const value of values) {
      const texts = customFieldTexts([writable], held(value));
      expect(changedCustomFields([writable], texts, held(value))).toBeUndefined();
    }
  });

  it('sends the write that turns what is held into what the form shows', () => {
    for (const was of [undefined, ...values]) {
      for (const next of values) {
        const shown = customFieldTexts([writable], held(next));
        const { sampled: sent } = changedCustomFields([writable], shown, held(was))?.custom ?? {};
        const after = sent === undefined ? was : applied(shaped(writable), was, sent);
        expect(after, JSON.stringify({ was, next, sent })).toEqual(next);
      }
    }
  });

  it('starts a field they may only see from everything they hold, as text', () => {
    const readOnly: MemberCustomField = { ...writable, access: { member: 'read' } };
    for (const value of values) {
      const { sampled } = customFieldTexts([readOnly], held(value));
      expect(sampled).toEqual(textOfValue(shaped(readOnly).shape, value));
    }
  });
});
