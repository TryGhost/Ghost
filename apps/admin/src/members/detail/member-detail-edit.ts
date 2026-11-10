import moment from 'moment-timezone';
import validator from 'validator';
import { z } from 'zod';
import { PartSchema, QUALIFIER, SEPARATOR } from '@tryghost/metafield-types/identity';
import {
  matchField,
  type FieldOfShape,
  type FieldShape,
} from '@tryghost/metafield-types/structure';
import {
  formShows,
  formTextOf,
  formWrite,
  heldValue,
  shaped,
  type ShapeText,
  type ShapeWrite,
} from '@tryghost/metafield-types/shapes';
import {
  memberCustomFieldIdentity,
  memberCustomFieldValueSchema,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import { dequal } from 'dequal';
import type { EditMemberData, Member } from '@tryghost/admin-x-framework/api/members';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

/**
 * One field's editor: the field with its shape and what its inputs hold, together, so the inputs
 * drawn for a shape only ever hold that shape's text.
 */
export type CustomFieldEditor = { [S in FieldShape]: EditorOf<S> }[FieldShape];

interface EditorOf<S extends FieldShape> {
  readonly shape: S;
  readonly field: FieldOfShape<S, MemberCustomField>;
  readonly text: ShapeText[S];
}

/**
 * What saving an editor writes: its field, with a write of the field's own shape, or `null` to
 * clear the field. Made only by `customFieldSave`, so a write can't be paired with a field of
 * another shape.
 */
export type CustomFieldSave = { [S in FieldShape]: SaveOf<S> }[FieldShape];

interface SaveOf<S extends FieldShape> {
  readonly shape: S;
  readonly field: FieldOfShape<S, MemberCustomField>;
  readonly write: ShapeWrite[S] | null;
}

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

// Soft limit shown as a countdown, not a hard maxlength (the DB column allows
// 2000). The counter may go negative.
export const NOTE_MAX_LENGTH = 500;

/**
 * The editable slice used for both dirty detection (compare draft vs server) and
 * the save payload. Name/email are trimmed; note preserves its whitespace.
 * Missing fields normalize to '' so a member with a null field and a draft with
 * '' don't read as dirty.
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

/**
 * The editor for a field as it opens: what the field's form can show of what the member holds, each
 * leaf as its text, or blank inputs. A list shows only the options the field still offers; what
 * saving does to an answer it can't show is `customFieldSave`'s to say.
 */
export function editorFor(field: MemberCustomField, held: unknown): CustomFieldEditor {
  return matchField<MemberCustomField, CustomFieldEditor>(field, {
    scalar: (of) => ({
      shape: 'scalar',
      field: of,
      text: formTextOf({ shape: 'scalar', field: of }, held) ?? '',
    }),
    record: (of) => ({
      shape: 'record',
      field: of,
      text: formTextOf({ shape: 'record', field: of }, held) ?? {},
    }),
    set: (of) => ({
      shape: 'set',
      field: of,
      text: formTextOf({ shape: 'set', field: of }, held) ?? [],
    }),
  });
}

/** An editor as it opened: what the member held then, and the inputs as they started from it. */
export interface OpenedEditor {
  readonly held: unknown;
  readonly editor: CustomFieldEditor;
}

/**
 * The save an editor's inputs make to what the member held when it opened, or undefined when there
 * is nothing to save. An editor nobody touched saves nothing, so a value that didn't move isn't
 * written and doesn't count as a member change. The one exception is an editor that opened empty
 * while the member holds answers it can't show, such as answers to options the field no longer
 * offers: saving it clears them. Such an answer held beside one the editor can show stays until
 * the editor is changed, since an untouched save writes nothing. A touched editor writes what
 * changed: `null` when a value goes, an emptied part of a record named as `null`, and the parts
 * left alone not named, so a part another writer set in the meantime survives.
 */
export function customFieldSave(
  editor: CustomFieldEditor,
  opened: OpenedEditor,
): CustomFieldSave | undefined {
  if (!isEdited(editor, opened.editor) && !openedEmptyOnAnswers(opened)) {
    return undefined;
  }
  return saveBetween(editor, opened.held);
}

/**
 * Whether an editor opened showing nothing while the member holds a value for its field. Only a
 * list's editor can: it shows only the options the field offers now, where a text's or an address's
 * shows whatever is held.
 */
function openedEmptyOnAnswers({ held, editor }: OpenedEditor): boolean {
  const of = shaped(editor.field);
  return formShows(of, editor.text) === undefined && heldValue(of, held) !== undefined;
}

/** The write that turns `held` into what the editor's inputs show, with the field it is to. */
function saveBetween(editor: CustomFieldEditor, held: unknown): CustomFieldSave | undefined {
  switch (editor.shape) {
    case 'scalar':
      return saveOf(editor, formWrite({ shape: 'scalar', field: editor.field }, editor.text, held));
    case 'record':
      return saveOf(editor, formWrite({ shape: 'record', field: editor.field }, editor.text, held));
    case 'set':
      return saveOf(editor, formWrite({ shape: 'set', field: editor.field }, editor.text, held));
  }
}

function saveOf<S extends FieldShape>(
  { shape, field }: EditorOf<S>,
  write: ShapeWrite[S] | null | undefined,
): SaveOf<S> | undefined {
  return write === undefined ? undefined : { shape, field, write };
}

/** Whether an editor's inputs show something other than what they showed when it opened. */
export function isEdited(editor: CustomFieldEditor, opened: CustomFieldEditor): boolean {
  const of = shaped(editor.field);
  return formWrite(of, editor.text, formShows(of, opened.text)) !== undefined;
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
 * a paste) doesn't render as an error the user hasn't provoked yet.
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
  // e.g. `email_disabled` was flipped directly. The banner still renders in that
  // case, just without the reason line.
  reason?: string;
  label: string | null;
}

/**
 * Extract a display-ready suppression status for the newsletter/suppression banner.
 * Returns null only when the member is not suppressed. `suppressed:true` is enough
 * to render the banner even without the info block: `email_disabled` alone (with
 * the Mailgun row already cleaned) still shows "Email disabled" + the Re-enable
 * button. Dates use site-local formatting.
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
 * Newsletters a new member is auto-subscribed to on save: those that opt in
 * via `subscribe_on_signup` AND are visible to member-tier subscribers
 * (`visibility: 'members'`). The result feeds the create-screen draft so
 * the toggles render as CHECKED, and the same list is included in the POST
 * payload so the server never has to fall back to its own default.
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
 * as one. Goes negative when the limit is exceeded.
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
 * The save payload for ONE custom field, from the per-field editor. Merge semantics do the rest:
 * only this key is touched, and `null` clears it.
 */
export function buildCustomFieldSavePayload(
  memberId: string,
  { field, write }: CustomFieldSave,
): EditMemberData {
  return { id: memberId, metafields: { [field.namespace]: { [field.key]: write } } };
}

/**
 * Client-side validation of the write a save sends, against the shared catalog schemas, so what
 * passes here is what the server is asked to accept. Each rule carries its own message, so what
 * this returns for a violation is the same sentence the server returns for it. Returns messages
 * keyed by `namespace.fieldKey` (scalar) or `namespace.fieldKey.part` (composite part), the path
 * shape of the server's 422 `property` once its `metafields.` prefix is dropped, so both error
 * sources render through one map. A clear, or no write at all, is always valid: no field is
 * required, and a clear says nothing for a rule to be about.
 */
export function getCustomFieldValidationErrors(
  save: CustomFieldSave | undefined,
): Record<string, string> {
  if (save === undefined || save.write === null) {
    return {};
  }
  const errors: Record<string, string> = {};
  const result = memberCustomFieldValueSchema(save.field).safeParse(save.write);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const parts = z.array(PartSchema).safeParse(issue.path);
      errors[memberCustomFieldIdentity(save.field, parts.data ?? [])] ??= issue.message;
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
