import moment from 'moment-timezone';
import validator from 'validator';
import { z } from 'zod';
import { PartSchema, QUALIFIER, SEPARATOR } from '@tryghost/metafield-types/identity';
import { isRecordValue, matchShape } from '@tryghost/metafield-types/structure';
import {
  memberCustomFieldIdentity,
  memberCustomFieldValueSchema,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { dequal } from 'dequal';
import type { EditMemberData, Member } from '@tryghost/admin-x-framework/api/members';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

export type EditableRecordValue = Partial<Record<string, string>>;

export type EditableCustomFieldValue = string | EditableRecordValue;

export interface MemberEditableLabel {
  name: string;
  slug: string;
}

export interface MemberEditableFields {
  name: string;
  email: string;
  note: string;
  labels: MemberEditableLabel[];
  // Subscribed-newsletter ids, sorted, so order changes never look dirty.
  newsletters: string[];
  // Custom field values are deliberately NOT part of this slice: they save
  // individually through their own per-field editor (one field, one Save),
  // never through the page's draft/Save flow.
}

// The members API returns null (not just undefined) for unset name/email/note,
// so accept both here rather than casting at the call sites.
interface MemberFieldSource {
  name?: string | null;
  email?: string | null;
  note?: string | null;
  labels?: Array<{ name: string; slug: string }> | null;
  newsletters?: Array<{ id: string }> | null;
}

// Soft limit shown as a countdown (Ember imposes no hard maxlength; the DB column
// allows 2000). The counter may go negative, matching the Ember behaviour.
export const NOTE_MAX_LENGTH = 500;

/**
 * The editable slice used for both dirty detection (compare draft vs server) and
 * the save payload. Name/email are trimmed to match the Ember blur-trim behaviour;
 * note preserves its whitespace. Missing fields normalize to '' so a member with a
 * null field and a draft with '' don't read as dirty.
 */
export function getMemberEditableSlice(member: MemberFieldSource): MemberEditableFields {
  return {
    name: (member.name ?? '').trim(),
    email: (member.email ?? '').trim(),
    note: member.note ?? '',
    // Sorted by slug (deterministic byte-order, not locale-dependent) so label
    // order — or a reordered server response — never reads as a dirty change.
    labels: (member.labels ?? [])
      .map((label) => ({ name: label.name, slug: label.slug }))
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)),
    newsletters: (member.newsletters ?? []).map((nl) => nl.id).sort(),
  };
}

export function emptyEditableValue(
  field: Pick<MemberCustomField, 'type'>,
): EditableCustomFieldValue {
  return matchShape<EditableCustomFieldValue>(field.type, {
    scalar: () => '',
    record: () => ({}),
  });
}

/** Each declared part's text, trimmed. A part the value holds no text for is left out. */
function trimmedParts(
  parts: Readonly<Record<string, unknown>>,
  value: Record<string, unknown>,
): EditableRecordValue {
  const record: EditableRecordValue = {};
  for (const part of Object.keys(parts)) {
    const held = value[part];
    if (typeof held === 'string') {
      record[part] = held.trim();
    }
  }
  return record;
}

/**
 * The value trimmed and with empty parts dropped, or undefined when nothing is left, so a value of
 * only blanks counts as no value whatever its shape.
 */
export function editableValueOf(
  field: Pick<MemberCustomField, 'type'>,
  value: unknown,
): EditableCustomFieldValue | undefined {
  return matchShape<EditableCustomFieldValue | undefined>(field.type, {
    scalar: () => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
    record: ({ parts }) => {
      if (!isRecordValue(value)) {
        return undefined;
      }
      const record = Object.fromEntries(
        Object.entries(trimmedParts(parts, value)).filter(([, held]) => held !== ''),
      );
      return Object.keys(record).length ? record : undefined;
    },
  });
}

/** Keyed by each field's identity. A field with no value is left out. */
export function getEditableCustomFieldValues(
  metafields: Record<string, Record<string, unknown> | undefined> | null | undefined,
  fields: readonly MemberCustomField[],
): Record<string, EditableCustomFieldValue> {
  const values: Record<string, EditableCustomFieldValue> = {};
  for (const field of fields) {
    const value = editableValueOf(field, metafields?.[field.namespace]?.[field.key]);
    if (value !== undefined) {
      values[memberCustomFieldIdentity(field)] = value;
    }
  }
  return values;
}

/**
 * Add or remove a newsletter id from the subscribed set, preserving sort order.
 * Idempotent by construction so a repeated toggle round-trips to no change.
 */
export function toggleMemberNewsletter(subscribedIds: string[], newsletterId: string): string[] {
  if (subscribedIds.includes(newsletterId)) {
    return subscribedIds.filter((id) => id !== newsletterId);
  }
  return [...subscribedIds, newsletterId].sort();
}

/**
 * Client-side email sanity check for the save gate; the server remains
 * authoritative. Mirrors the server's update semantics: an email is validated
 * only when it differs from the stored one, because the server deliberately
 * grandfathers stored emails that predate stricter validation
 * (member-repository.js validates the email only when it changed).
 */
export function isValidMemberEmail(email: string, storedEmail?: string): boolean {
  const trimmed = email.trim();
  if (storedEmail !== undefined && trimmed === storedEmail.trim()) {
    return true;
  }
  return validator.isEmail(trimmed);
}

/**
 * Message to render under the email field. Gated on `touched` so the empty
 * initial state on the New member screen (or an email cleared briefly during
 * a paste) doesn't render as an error the user hasn't provoked yet. Ember's
 * validator runs on save-attempt for the same reason
 * (`ghost/admin/app/validators/member.js:15`).
 */
export function getEmailErrorMessage(
  email: string,
  touched: boolean,
  storedEmail?: string,
): string | null {
  if (!touched) {
    return null;
  }
  if (email.trim() === '') {
    return 'Email is required.';
  }
  if (!isValidMemberEmail(email, storedEmail)) {
    return 'Invalid email.';
  }
  return null;
}

export interface MemberSuppressionInfo {
  // Undefined for a `suppressed:true` member without a bounce/complaint history —
  // e.g. `email_disabled` was flipped directly. Ember still renders the banner in
  // that case, just without the reason line.
  reason?: string;
  label: string | null;
}

/**
 * Extract a display-ready suppression status for the newsletter/suppression banner.
 * Returns null only when the member is not suppressed. `suppressed:true` is enough
 * to render the banner even without the info block, matching Ember's behaviour
 * where `email_disabled` alone (with the Mailgun row already cleaned) still shows
 * "Email disabled" + the Re-enable button. Dates use site-local formatting to
 * match the Ember copy exactly.
 */
export function getMemberSuppressionInfo(
  emailSuppression: Member['email_suppression'],
): MemberSuppressionInfo | null {
  if (!emailSuppression?.suppressed) {
    return null;
  }
  const info = emailSuppression.info;
  if (!info) {
    return { label: null };
  }
  const { reason, timestamp } = info;
  const date = moment(new Date(timestamp)).format('D MMM YYYY');
  switch (reason) {
    case 'fail':
      return { reason, label: `Bounced on ${date}` };
    case 'spam':
      return { reason, label: `Flagged as spam on ${date}` };
    default:
      return { reason, label: `Email disabled on ${date}` };
  }
}

/**
 * Newsletters that Ember auto-subscribes a new member to on save. Ports
 * `gh-member-settings-form.js:233-241`: keep only newsletters that opt in
 * via `subscribe_on_signup` AND are visible to member-tier subscribers
 * (`visibility: 'members'`). The result feeds the create-screen draft so
 * the toggles render as CHECKED, as on Ember's create screen, and the same
 * list is included in the POST payload so the server never has to fall back
 * to its own default.
 */
export function getDefaultNewsletterIdsForNewMember(
  newsletters:
    | Array<{ id: string; subscribe_on_signup?: boolean; visibility?: string | null }>
    | undefined
    | null,
): string[] {
  if (!newsletters) {
    return [];
  }
  return newsletters
    .filter((nl) => nl.subscribe_on_signup === true && nl.visibility === 'members')
    .map((nl) => nl.id);
}

/**
 * Characters remaining under the note soft limit. Counts unicode code points (via
 * spread) rather than UTF-16 code units so multi-byte characters like emoji count
 * as one — matching the Ember `gh-count-down-characters` helper. Goes negative when
 * the limit is exceeded.
 */
export function getNoteCharactersLeft(note: string): number {
  return NOTE_MAX_LENGTH - [...note].length;
}

/**
 * Build the `useEditMember` payload for the field edits in this slice. Labels are
 * sent as {name, slug} (server matches case-insensitively by name). Newsletters
 * are sent as {id}[] ONLY when the user changed them, because the server replaces
 * the subscription set with exactly what we send — including [] which would
 * unsubscribe the member from every newsletter. Callers pass the server baseline
 * so we can tell "unchanged" from "all newsletters removed".
 */
export function buildMemberFieldEditPayload(
  id: string,
  draft: MemberEditableFields,
  serverBaseline: MemberEditableFields,
): EditMemberData {
  const normalized = normalizeDraftForComparison(draft);
  const payload: EditMemberData = {
    id,
    name: normalized.name,
    email: normalized.email,
    note: normalized.note,
    labels: normalized.labels,
  };
  if (!dequal(normalized.newsletters, serverBaseline.newsletters)) {
    payload.newsletters = normalized.newsletters.map((nlId) => ({ id: nlId }));
  }
  return payload;
}

/**
 * The value the save sends, or undefined when the save clears the field. Validation checks this
 * same value rather than the one on display: the editor keeps an emptied address part so the save
 * can clear it, and the displayed value drops it.
 *
 * A value of another shape than its field's is passed through unchanged, so the field's rule
 * refuses it rather than the save treating it as a clear and deleting what the member holds.
 */
function customFieldValueToSave(
  field: Pick<MemberCustomField, 'type'>,
  value: EditableCustomFieldValue,
): EditableCustomFieldValue | undefined {
  return matchShape<EditableCustomFieldValue | undefined>(field.type, {
    scalar: () => (typeof value === 'string' ? value.trim() || undefined : value),
    // A write changes only the parts it names, so an emptied part has to be sent as an empty
    // string; leaving it out would leave it unchanged. A record with nothing left in it clears the
    // whole field, which the caller sends as `null`.
    record: ({ parts }) => {
      if (typeof value === 'string') {
        return value;
      }
      const record = trimmedParts(parts, value);
      return Object.values(record).some((part) => part !== '') ? record : undefined;
    },
  });
}

/**
 * The save payload for ONE custom field, from the per-field editor. Merge
 * semantics do the rest: only this key is touched, `null` clears it, and an
 * address is sent whole (the merge is per field, not per part).
 */
export function buildCustomFieldSavePayload(
  memberId: string,
  field: Pick<MemberCustomField, 'namespace' | 'key' | 'type'>,
  value: EditableCustomFieldValue,
): EditMemberData {
  return {
    id: memberId,
    metafields: {
      [field.namespace]: { [field.key]: customFieldValueToSave(field, value) ?? null },
    },
  };
}

/**
 * Client-side validation of custom field values against the shared catalog
 * schemas. Each rule carries its own message, so what this returns for a
 * violation is the same sentence the server returns for it, and the screen
 * reads the same whichever tier caught it. Returns messages keyed by
 * `namespace.fieldKey` (scalar) or `namespace.fieldKey.part` (composite
 * part), the path shape of the server's 422 `property` once its
 * `metafields.` prefix is dropped, so both error sources render through one map.
 * Cleared/empty values are always valid — fields are optional.
 */
export function getCustomFieldValidationErrors(
  draftCustomFields: Record<string, EditableCustomFieldValue>,
  fields: MemberCustomField[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const draft = draftCustomFields[field.key];
    // Checked as the save would send it, so what passes here is what the server is
    // asked to accept. A value that clears the field is always valid: no field is
    // required, and a clear says nothing for a rule to be about.
    const value = draft === undefined ? undefined : customFieldValueToSave(field, draft);
    if (value === undefined) {
      continue;
    }
    const result = memberCustomFieldValueSchema(field).safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const parts = z.array(PartSchema).safeParse(issue.path);
        errors[memberCustomFieldIdentity(field, parts.data ?? [])] ??= issue.message;
      }
    }
  }
  return errors;
}

const ServerErrors = z.object({ data: z.object({ errors: z.array(z.unknown()) }) });

/**
 * Each reported error is parsed on its own, so one this build can't read doesn't hide the others.
 */
const ServerError = z.object({
  property: z.string().nullish(),
  context: z.string().nullish(),
  message: z.string().nullish(),
});

/**
 * Field-level errors from a failed member save. The server reports one error per offending
 * field: `property` holds the field's address — container, namespace, key, and for a
 * multi-part value the part — and `context` holds the reason. Splitting the address is
 * what lets the message render under the input it belongs to. Returns undefined for any
 * other failure shape so callers can fall back to a generic toast.
 */
export function parseCustomFieldServerErrors(error: unknown): Record<string, string> | undefined {
  const reported = ServerErrors.safeParse(error).data?.data.errors ?? [];
  const errors: Record<string, string> = {};
  const qualified = `${QUALIFIER}${SEPARATOR}`;
  for (const apiError of reported.flatMap((raw) => ServerError.safeParse(raw).data ?? [])) {
    if (apiError.property?.startsWith(qualified)) {
      errors[apiError.property.slice(qualified.length)] =
        apiError.context || apiError.message || 'Invalid value.';
    }
  }
  return Object.keys(errors).length ? errors : undefined;
}

/**
 * Resolve a list of selected label slugs back to full {name, slug} objects using a
 * known-labels lookup. A slug missing from the lookup falls back to using the slug
 * as the name — callers must ensure freshly-created labels are recorded first so a
 * real name is never lost (which would make the server create a duplicate).
 */
export function resolveSlugsToLabels(
  slugs: string[],
  known: ReadonlyMap<string, MemberEditableLabel>,
): MemberEditableLabel[] {
  return slugs.map((slug) => known.get(slug) ?? { name: slug, slug });
}

/**
 * Normalize an already-shaped draft for dirty comparison. The draft carries user
 * input for string fields (which may contain leading/trailing whitespace); the
 * relation lists (labels, newsletters) are already in their normalized shape.
 * Trims strings so whitespace-only differences don't read as dirty.
 */
export function normalizeDraftForComparison(draft: MemberEditableFields): MemberEditableFields {
  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    note: draft.note,
    labels: draft.labels,
    newsletters: draft.newsletters,
  };
}

/**
 * Whether the current draft still matches the last server baseline it was seeded
 * from — i.e. the user has made no local edits. When true, a fresh server value
 * (from a background refetch) can safely replace the draft without clobbering user
 * input; when false, the draft holds unsaved edits and must be preserved.
 * Comparison is on the normalized slice so whitespace-only differences don't count.
 */
export function isDraftInSyncWithServer(
  draft: MemberEditableFields | undefined,
  serverBaseline: MemberEditableFields | undefined,
): boolean {
  return !draft || (!!serverBaseline && dequal(normalizeDraftForComparison(draft), serverBaseline));
}
