import {
  NOTE_MAX_LENGTH,
  buildCustomFieldSavePayload,
  buildMemberFieldEditPayload,
  customFieldSave,
  editorFor,
  getCustomFieldValidationErrors,
  getDefaultNewsletterIdsForNewMember,
  getEmailErrorMessage,
  getMemberEditableSlice,
  getMemberSuppressionInfo,
  getNoteCharactersLeft,
  isDraftInSyncWithServer,
  isValidMemberEmail,
  parseCustomFieldServerErrors,
  resolveSlugsToLabels,
  toggleMemberNewsletter,
  type CustomFieldEditor,
} from './member-detail-edit';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { FieldOfShape, FieldShape } from '@tryghost/metafield-types/structure';
import {
  SHAPES,
  accept,
  heldValue,
  shaped,
  type ShapedField,
  type TypedSettings,
} from '@tryghost/metafield-types';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from '@tryghost/metafield-types/test/fixtures';
import type { ShapeText } from '@tryghost/metafield-types/shapes';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { CUSTOM_NAMESPACE, KeySchema } from '@tryghost/metafield-types/identity';

const customField = (key: string, type: 'short_text' | 'address'): MemberCustomField => ({
  namespace: CUSTOM_NAMESPACE,
  key: KeySchema.parse(key),
  name: key,
  type,
  status: 'active',
  access: { member: 'none' },
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: null,
});
const jobTitle = customField('job_title', 'short_text');
const homeAddress = customField('home_address', 'address');

describe('getMemberEditableSlice', () => {
  it('normalizes missing fields to empty strings and empty relation lists', () => {
    expect(getMemberEditableSlice({})).toEqual({
      name: '',
      email: '',
      note: '',
      labels: [],
      newsletters: [],
    });
    expect(
      getMemberEditableSlice({
        name: null,
        email: null,
        note: null,
        labels: null,
        newsletters: null,
      }),
    ).toEqual({ name: '', email: '', note: '', labels: [], newsletters: [] });
  });

  it('trims name and email but preserves note whitespace', () => {
    expect(
      getMemberEditableSlice({ name: '  Ada  ', email: ' ada@x.co ', note: '  hi  ' }),
    ).toEqual({ name: 'Ada', email: 'ada@x.co', note: '  hi  ', labels: [], newsletters: [] });
  });

  it('passes through already-clean fields', () => {
    expect(getMemberEditableSlice({ name: 'Ada', email: 'ada@x.co', note: 'VIP' })).toEqual({
      name: 'Ada',
      email: 'ada@x.co',
      note: 'VIP',
      labels: [],
      newsletters: [],
    });
  });

  it('normalizes labels to {name, slug} sorted by slug', () => {
    const slice = getMemberEditableSlice({
      name: 'Ada',
      labels: [
        { name: 'VIP', slug: 'vip' },
        { name: 'Beta', slug: 'beta' },
      ],
    });
    expect(slice.labels).toEqual([
      { name: 'Beta', slug: 'beta' },
      { name: 'VIP', slug: 'vip' },
    ]);
  });

  it('normalizes newsletter subscriptions to an id list sorted by id', () => {
    const slice = getMemberEditableSlice({
      newsletters: [{ id: 'nl_c' }, { id: 'nl_a' }, { id: 'nl_b' }],
    });
    expect(slice.newsletters).toEqual(['nl_a', 'nl_b', 'nl_c']);
  });
});

describe('buildMemberFieldEditPayload', () => {
  const baseline = {
    name: 'Ada',
    email: 'ada@x.co',
    note: '',
    labels: [],
    newsletters: ['nl_a', 'nl_b'],
  };

  it('omits newsletters when the user has not changed them', () => {
    // Sending `[]` would unsubscribe the member from every newsletter, so an
    // unchanged newsletter set must NOT appear on the payload at all.
    const payload = buildMemberFieldEditPayload('mem_1', { ...baseline, name: 'Ada B' }, baseline);
    expect(payload.newsletters).toBeUndefined();
    expect(payload.name).toBe('Ada B');
  });

  it('sends newsletters as {id}[] when the user has toggled them', () => {
    const payload = buildMemberFieldEditPayload(
      'mem_1',
      { ...baseline, newsletters: ['nl_a'] },
      baseline,
    );
    expect(payload.newsletters).toEqual([{ id: 'nl_a' }]);
  });

  it('sends an empty newsletters array only when the user has explicitly unsubscribed from all', () => {
    const payload = buildMemberFieldEditPayload(
      'mem_1',
      { ...baseline, newsletters: [] },
      baseline,
    );
    expect(payload.newsletters).toEqual([]);
  });

  it('never carries metafields — those save individually, not through the page', () => {
    const payload = buildMemberFieldEditPayload('mem_1', { ...baseline, name: 'Ada B' }, baseline);
    expect(payload.metafields).toBeUndefined();
  });
});

describe('getMemberSuppressionInfo', () => {
  it('returns null when the member is not suppressed', () => {
    expect(getMemberSuppressionInfo(undefined)).toBeNull();
    expect(getMemberSuppressionInfo({ suppressed: false })).toBeNull();
  });

  it('shows the banner without a label when suppressed but the info block is missing', () => {
    // "Email disabled" + the Re-enable button still render in this case
    // (e.g. email_disabled=true after the Mailgun row was cleaned).
    expect(getMemberSuppressionInfo({ suppressed: true })).toEqual({ label: null });
  });

  it('reports the "Bounced" reason with a formatted date for a fail suppression', () => {
    // Use a mid-day UTC timestamp so the local-vs-UTC render doesn't cross a day boundary.
    expect(
      getMemberSuppressionInfo({
        suppressed: true,
        info: { reason: 'fail', timestamp: '2026-01-15T12:00:00.000Z' },
      }),
    ).toEqual({ reason: 'fail', label: 'Bounced on 15 Jan 2026' });
  });

  it('reports the "Flagged as spam" reason with a formatted date for a spam suppression', () => {
    expect(
      getMemberSuppressionInfo({
        suppressed: true,
        info: { reason: 'spam', timestamp: '2026-02-01T12:00:00.000Z' },
      }),
    ).toEqual({ reason: 'spam', label: 'Flagged as spam on 1 Feb 2026' });
  });

  it('falls back to a generic label for an unexpected reason', () => {
    expect(
      getMemberSuppressionInfo({
        suppressed: true,
        info: { reason: 'other', timestamp: '2026-03-01T12:00:00.000Z' },
      }),
    ).toEqual({ reason: 'other', label: 'Email disabled on 1 Mar 2026' });
  });
});

describe('toggleMemberNewsletter', () => {
  it('subscribes a member to a newsletter they are not yet subscribed to', () => {
    expect(toggleMemberNewsletter(['nl_a'], 'nl_b')).toEqual(['nl_a', 'nl_b']);
  });

  it('unsubscribes a member from a newsletter they are subscribed to', () => {
    expect(toggleMemberNewsletter(['nl_a', 'nl_b'], 'nl_a')).toEqual(['nl_b']);
  });

  it('is stable for a repeated toggle', () => {
    const once = toggleMemberNewsletter([], 'nl_a');
    const twice = toggleMemberNewsletter(once, 'nl_a');
    expect(twice).toEqual([]);
  });
});

describe('isValidMemberEmail', () => {
  it('accepts normal and plus-addressed emails', () => {
    expect(isValidMemberEmail('ada@example.com')).toBe(true);
    expect(isValidMemberEmail('ada+news@example.com')).toBe(true);
  });

  it('trims before validating', () => {
    expect(isValidMemberEmail('  ada@example.com  ')).toBe(true);
  });

  it('rejects empty or malformed emails', () => {
    expect(isValidMemberEmail('')).toBe(false);
    expect(isValidMemberEmail('   ')).toBe(false);
    expect(isValidMemberEmail('not-an-email')).toBe(false);
    expect(isValidMemberEmail('a@b')).toBe(false);
    expect(isValidMemberEmail('a@b.')).toBe(false);
    expect(isValidMemberEmail('a b@example.com')).toBe(false);
  });

  it('grandfathers a stored email that no longer passes validation when unchanged', () => {
    expect(isValidMemberEmail('legacy@mail_host.com', 'legacy@mail_host.com')).toBe(true);
    // Trim-insensitive: the draft field may carry surrounding whitespace
    expect(isValidMemberEmail(' legacy@mail_host.com ', 'legacy@mail_host.com')).toBe(true);
    // Changing away from the stored value re-applies strict validation
    expect(isValidMemberEmail('other@mail_host.com', 'legacy@mail_host.com')).toBe(false);
    // A stored email is no excuse for a different invalid value
    expect(isValidMemberEmail('nope', 'legacy@mail_host.com')).toBe(false);
    // Create mode (no stored email) stays strict
    expect(isValidMemberEmail('legacy@mail_host.com')).toBe(false);
  });
});

describe('getDefaultNewsletterIdsForNewMember', () => {
  // `subscribe_on_signup: true` AND `visibility: 'members'`. A drift on
  // either condition would silently either over-subscribe (privacy risk if
  // a paid newsletter leaks to a free member) or under-subscribe (marketing
  // regression if a signup-default newsletter is skipped).
  it('includes only subscribe_on_signup + visibility:members newsletters', () => {
    const newsletters = [
      { id: 'a', subscribe_on_signup: true, visibility: 'members' }, // ✓
      { id: 'b', subscribe_on_signup: true, visibility: 'paid' }, // ✗ paid-only
      { id: 'c', subscribe_on_signup: false, visibility: 'members' }, // ✗ opt-in only
      { id: 'd', subscribe_on_signup: true, visibility: null }, // ✗ visibility not 'members'
      { id: 'e', subscribe_on_signup: true, visibility: 'members' }, // ✓
    ];
    expect(getDefaultNewsletterIdsForNewMember(newsletters)).toEqual(['a', 'e']);
  });

  it('returns [] for undefined / null / empty inputs (loading states)', () => {
    expect(getDefaultNewsletterIdsForNewMember(undefined)).toEqual([]);
    expect(getDefaultNewsletterIdsForNewMember(null)).toEqual([]);
    expect(getDefaultNewsletterIdsForNewMember([])).toEqual([]);
  });

  it('preserves input order (no re-sort)', () => {
    // Downstream consumers may rely on original ordering (e.g. a
    // "primary newsletter first" rule); avoid injecting an implicit sort
    // that would silently reorder the resulting UI toggles.
    const newsletters = [
      { id: 'z', subscribe_on_signup: true, visibility: 'members' },
      { id: 'a', subscribe_on_signup: true, visibility: 'members' },
    ];
    expect(getDefaultNewsletterIdsForNewMember(newsletters)).toEqual(['z', 'a']);
  });
});

describe('getEmailErrorMessage', () => {
  it('returns null when the field has not been touched, regardless of value', () => {
    // Core New-member bug: the initial render of the create screen would
    // paint "Email is required." before the user typed anything. Gating
    // on `touched` keeps the field neutral until the user interacts.
    expect(getEmailErrorMessage('', false)).toBeNull();
    expect(getEmailErrorMessage('not-an-email', false)).toBeNull();
    expect(getEmailErrorMessage('ada@example.com', false)).toBeNull();
  });

  it('reports "Email is required." when touched and empty (or whitespace only)', () => {
    expect(getEmailErrorMessage('', true)).toBe('Email is required.');
    expect(getEmailErrorMessage('   ', true)).toBe('Email is required.');
  });

  it('reports "Invalid email." when touched and non-empty but malformed', () => {
    expect(getEmailErrorMessage('not-an-email', true)).toBe('Invalid email.');
    expect(getEmailErrorMessage('a@b', true)).toBe('Invalid email.');
  });

  it('returns null when touched and the value is a valid email', () => {
    expect(getEmailErrorMessage('ada@example.com', true)).toBeNull();
    expect(getEmailErrorMessage('  ada@example.com  ', true)).toBeNull();
  });
});

describe('getNoteCharactersLeft', () => {
  it('counts down from the 500-char soft limit', () => {
    expect(getNoteCharactersLeft('')).toBe(NOTE_MAX_LENGTH);
    expect(getNoteCharactersLeft('hi')).toBe(NOTE_MAX_LENGTH - 2);
  });

  it('counts unicode code points, not UTF-16 code units (emoji count as one)', () => {
    // '👍' is two UTF-16 code units — String.length would over-count it.
    expect(getNoteCharactersLeft('👍👍👍')).toBe(NOTE_MAX_LENGTH - 3);
  });

  it('goes negative when the soft limit is exceeded', () => {
    expect(getNoteCharactersLeft('x'.repeat(520))).toBe(-20);
  });
});

describe('isDraftInSyncWithServer', () => {
  const server = {
    name: 'Ada',
    email: 'ada@x.co',
    note: 'VIP',
    labels: [{ name: 'Beta', slug: 'beta' }],
    newsletters: ['nl_a'],
  };

  it('is in sync when there is no draft yet', () => {
    expect(isDraftInSyncWithServer(undefined, server)).toBe(true);
  });

  it('is in sync when the draft equals the server baseline', () => {
    expect(isDraftInSyncWithServer({ ...server }, server)).toBe(true);
  });

  it('ignores whitespace-only differences (normalized comparison)', () => {
    expect(isDraftInSyncWithServer({ ...server, name: 'Ada ', email: ' ada@x.co' }, server)).toBe(
      true,
    );
  });

  it('is out of sync when the user has edited a field', () => {
    expect(isDraftInSyncWithServer({ ...server, name: 'Ada B' }, server)).toBe(false);
  });

  it('is out of sync when the user has changed labels', () => {
    expect(isDraftInSyncWithServer({ ...server, labels: [] }, server)).toBe(false);
  });

  it('is out of sync when the user has toggled a newsletter', () => {
    expect(isDraftInSyncWithServer({ ...server, newsletters: [] }, server)).toBe(false);
  });
});

/**
 * The editor opened on what the member holds, with its inputs then given `text`, which has to be
 * of the field's shape.
 */
function typed(
  field: MemberCustomField,
  held: unknown,
  text: ShapeText[FieldShape],
): CustomFieldEditor {
  const editor = editorFor(field, held);
  switch (editor.shape) {
    case 'scalar':
      if (typeof text !== 'string') {
        throw new Error('a scalar field takes text');
      }
      return { ...editor, text };
    case 'set':
      if (!Array.isArray(text)) {
        throw new Error('a set field takes a list');
      }
      return { ...editor, text };
    case 'record':
      if (typeof text === 'string' || Array.isArray(text)) {
        throw new Error('a record field takes parts');
      }
      return { ...editor, text };
  }
}

/** What a write does to what a field holds, as the members API accepts and applies it. */
function applied<S extends FieldShape>(
  of: ShapedField<TypedSettings, S>,
  held: unknown,
  write: unknown,
): unknown {
  const acceptance = accept(of, write);
  if (!acceptance.success) {
    throw new Error(`the site would refuse ${JSON.stringify(write)}`);
  }
  return SHAPES[of.shape].apply(heldValue(of, held), acceptance.accepted.value);
}

/** The editor for `field` as it opens on what the member holds. */
const opened = (field: MemberCustomField, held: unknown) => ({
  held,
  editor: editorFor(field, held),
});

/** What saving that editor sends for the member's custom fields, or undefined when it sends nothing. */
function saved(field: MemberCustomField, held: unknown, text: ShapeText[FieldShape]) {
  const save = customFieldSave(typed(field, held, text), opened(field, held));
  return save === undefined ? undefined : buildCustomFieldSavePayload('mem_1', save).metafields;
}

/** The messages the editor shows for what saving it would send. */
function errorsOf(field: MemberCustomField, held: unknown, text: ShapeText[FieldShape]) {
  return getCustomFieldValidationErrors(
    customFieldSave(typed(field, held, text), opened(field, held)),
  );
}

describe('a custom field editor', () => {
  it('opens on what the member holds, as text, or blank', () => {
    expect(editorFor(jobTitle, 'Editor').text).toBe('Editor');
    expect(editorFor(jobTitle, undefined).text).toBe('');
    expect(editorFor(homeAddress, undefined).text).toEqual({});
  });

  it('opens on only the parts the type declares', () => {
    expect(
      editorFor(homeAddress, { line1: '1 Main St', city: 'Berlin', not_a_part: 'ignored' }).text,
    ).toEqual({ line1: '1 Main St', city: 'Berlin' });
  });

  // Each input is handed text of its own field's shape, so no other can reach a save.
  it('holds only text of its own shape', () => {
    type RecordField = FieldOfShape<'record', MemberCustomField>;
    expectTypeOf<{
      shape: 'record';
      field: RecordField;
      text: string;
    }>().not.toExtend<CustomFieldEditor>();
    expectTypeOf<{
      shape: 'record';
      field: RecordField;
      text: ShapeText['record'];
    }>().toExtend<CustomFieldEditor>();
  });
});

describe('saving a custom field', () => {
  const held = { line1: '1 Main St', line2: 'Flat 2', city: 'Berlin', country: 'DE' };

  it('sends only this field, as what its input reads as', () => {
    expect(saved(jobTitle, undefined, ' Publisher ')).toEqual({
      custom: { job_title: 'Publisher' },
    });
  });

  it('sends nothing when the inputs show what the member holds', () => {
    expect(saved(jobTitle, 'Editor', ' Editor ')).toBeUndefined();
    expect(saved(homeAddress, held, { ...held, line1: ' 1 Main St ' })).toBeUndefined();
  });

  it('clears an emptied value with null', () => {
    expect(saved(jobTitle, 'Editor', '  ')).toEqual({ custom: { job_title: null } });
  });

  // An untouched editor writes nothing, so an answer to an option the field no longer offers
  // survives a save that changed nothing. One that opened empty on such answers clears them, and
  // one that was touched writes what it shows, which drops them.
  it('saves nothing untouched, unless it opened empty on answers it can’t show', () => {
    const animals: MemberCustomField = {
      ...customField('animals', 'short_text'),
      type: 'list',
      settings: { options: ['Dog', 'Cat', 'Fish'], multiple: true },
    };
    expect(saved(animals, ['Fish', 'Dolphin'], ['Fish'])).toBeUndefined();
    expect(saved(animals, ['Dolphin'], [])).toEqual({ custom: { animals: null } });
    expect(saved(animals, ['Fish', 'Dolphin'], ['Dog', 'Fish'])).toEqual({
      custom: { animals: ['Dog', 'Fish'] },
    });
    // Removing the one answer it shows clears the field, hidden answers and all.
    expect(saved(animals, ['Fish', 'Dolphin'], [])).toEqual({ custom: { animals: null } });

    // A field that went from several answers to one shows none of several held, so the editor
    // opens empty on them and an untouched save clears them.
    const oneAnimal: MemberCustomField = {
      ...animals,
      settings: { options: ['Dog', 'Cat', 'Fish'], multiple: false },
    };
    expect(saved(oneAnimal, ['Dog', 'Cat'], [])).toEqual({ custom: { animals: null } });
    expect(saved(oneAnimal, ['Dog'], ['Dog'])).toBeUndefined();
  });

  // A write touches only the parts it names, so a part left out is left alone. An emptied part
  // is named as null, or the stored one would survive the person deleting it.
  it('names only the parts that changed, an emptied one as null', () => {
    expect(saved(homeAddress, held, { ...held, line2: '', city: 'Munich' })).toEqual({
      custom: { home_address: { line2: null, city: 'Munich' } },
    });
  });

  // Clearing the whole field would also clear a part someone else set in the meantime.
  it('clears an address emptied of everything part by part', () => {
    expect(
      saved(homeAddress, { line1: '1 Main St', city: 'Berlin' }, { line1: '', city: ' ' }),
    ).toEqual({
      custom: { home_address: { line1: null, city: null } },
    });
  });
});

describe('getCustomFieldValidationErrors', () => {
  const validAddress = { line1: '1 Main St', city: 'Berlin', postal_code: '10115', country: 'DE' };

  it('returns no errors for valid values', () => {
    expect(errorsOf(jobTitle, undefined, 'Editor')).toEqual({});
    expect(errorsOf(homeAddress, undefined, validAddress)).toEqual({});
  });

  it('returns no errors for a clear, or for nothing to save — fields are optional', () => {
    expect(errorsOf(jobTitle, 'Editor', '')).toEqual({});
    expect(errorsOf(homeAddress, undefined, { line1: '  ', city: '  ' })).toEqual({});
  });

  it('accepts a partial address — no part is required', () => {
    // Which parts of an address exist is a per-country question, so an address without a city
    // or postal code is valid rather than incomplete.
    expect(errorsOf(homeAddress, undefined, { line1: '1 Main St' })).toEqual({});
    expect(errorsOf(homeAddress, undefined, { country: 'HK' })).toEqual({});
  });

  it('explains a malformed country code in words a person can act on, however it was wrong', () => {
    // Spelled out rather than read from the catalog: the API returns this same string,
    // and an expectation computed from the catalog would pass whatever it said.
    const message = 'Enter a 2-letter country code, like US.';

    for (const country of ['DEU', '12', 'D']) {
      expect(errorsOf(homeAddress, undefined, { ...validAddress, country })).toEqual({
        'custom.home_address.country': message,
      });
    }
  });

  it('reports every part that is wrong, not just the first', () => {
    // The server stops at the first issue because it only needs to refuse the write.
    // The screen is placing a message under each input, so it needs all of them.
    expect(errorsOf(homeAddress, undefined, { country: 'DEU', line1: 'x'.repeat(256) })).toEqual({
      'custom.home_address.country': 'Enter a 2-letter country code, like US.',
      'custom.home_address.line1': 'Use 255 characters or fewer.',
    });
  });

  it('reports an over-long short_text value with the limit a person can act on', () => {
    expect(errorsOf(jobTitle, undefined, 'x'.repeat(256))).toEqual({
      'custom.job_title': 'Use 255 characters or fewer.',
    });
  });

  it('lets a part with a format be emptied, not just one with a bound', () => {
    // Emptying the country box is the one way a person removes a country while keeping the
    // address. Its rule is a pattern rather than a length, so unless a part clears the same way
    // whatever its rule, the save is refused and the box cannot be emptied at all.
    const withCountry = { line1: '62 Ghost Lane', city: 'Dublin', country: 'IE' };
    const emptied = { ...withCountry, country: '' };

    expect(errorsOf(homeAddress, withCountry, emptied)).toEqual({});
    expect(saved(homeAddress, withCountry, emptied)).toEqual({
      custom: { home_address: { country: null } },
    });
  });
});

describe('parseCustomFieldServerErrors', () => {
  const serverError = (
    apiErrors: Array<{
      property?: string | null;
      context?: string | null;
      message?: string | null;
    }>,
  ) => ({ data: { errors: apiErrors } });

  it('maps a custom-fields 422 onto its dotted field path, preferring context', () => {
    // `message` is the same generic line on every rejected edit; the reason a person
    // reads is in `context`.
    expect(
      parseCustomFieldServerErrors(
        serverError([
          {
            property: 'metafields.custom.home_address.postal_code',
            context: 'Use 32 characters or fewer.',
            message: 'Validation error, cannot edit member.',
          },
        ]),
      ),
    ).toEqual({ 'custom.home_address.postal_code': 'Use 32 characters or fewer.' });
  });

  it('falls back to the message when context is empty', () => {
    expect(
      parseCustomFieldServerErrors(
        serverError([{ property: 'metafields.custom.job_title', context: null, message: 'Nope.' }]),
      ),
    ).toEqual({ 'custom.job_title': 'Nope.' });
  });

  it('returns undefined for failures that are not custom-fields shaped', () => {
    expect(
      parseCustomFieldServerErrors(
        serverError([{ property: 'email', context: 'Invalid', message: 'Invalid' }]),
      ),
    ).toBeUndefined();
    expect(parseCustomFieldServerErrors(new Error('network'))).toBeUndefined();
    expect(parseCustomFieldServerErrors(undefined)).toBeUndefined();
  });
});

describe('resolveSlugsToLabels', () => {
  const known = new Map([
    ['vip', { name: 'VIP', slug: 'vip' }],
    ['beta', { name: 'Beta', slug: 'beta' }],
  ]);

  it('resolves known slugs to their full label objects, preserving order', () => {
    expect(resolveSlugsToLabels(['beta', 'vip'], known)).toEqual([
      { name: 'Beta', slug: 'beta' },
      { name: 'VIP', slug: 'vip' },
    ]);
  });

  it('falls back to using the slug as the name for an unknown slug', () => {
    expect(resolveSlugsToLabels(['mystery'], known)).toEqual([
      { name: 'mystery', slug: 'mystery' },
    ]);
  });
});

// Every field type, over the fixtures it declares: the editor opens on what a member holds, and
// saving it sends the write that turns that into what its inputs show.
describe.each(
  ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
)('the editor for a %s field', (_type, { field, values }) => {
  const editing: MemberCustomField = {
    namespace: CUSTOM_NAMESPACE,
    key: KeySchema.parse('sampled'),
    name: 'Sample',
    status: 'active',
    access: { member: 'none' },
    created_at: '2026-07-14T00:00:00.000Z',
    updated_at: null,
    ...field,
  };

  it('sends nothing when saved untouched', () => {
    for (const value of values) {
      expect(customFieldSave(editorFor(editing, value), opened(editing, value))).toBeUndefined();
    }
  });

  it('sends a write the field accepts that turns what is held into what it shows', () => {
    const of = shaped(editing);
    for (const was of [undefined, ...values]) {
      for (const next of values) {
        const save = customFieldSave(
          typed(editing, was, editorFor(editing, next).text),
          opened(editing, was),
        );
        expect(getCustomFieldValidationErrors(save)).toEqual({});
        const after =
          save === undefined ? was : save.write === null ? undefined : applied(of, was, save.write);
        expect(after, JSON.stringify({ was, next, write: save?.write })).toEqual(next);
      }
    }
  });
});
