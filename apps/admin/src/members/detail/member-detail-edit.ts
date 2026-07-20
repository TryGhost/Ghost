import moment from 'moment-timezone';
import {MEMBER_CUSTOM_FIELD_TYPES} from '@tryghost/admin-x-framework/api/member-custom-fields';
import {dequal} from 'dequal';
import type {EditMemberData, Member} from '@tryghost/admin-x-framework/api/members';
import type {MemberCustomField, MemberCustomFieldAddress} from '@tryghost/admin-x-framework/api/member-custom-fields';

// The sub-fields of the address composite, in display order. Partial because a
// draft mid-edit (or a normalized sparse value) may hold any subset; the shared
// AddressValue schema — enforced by the server — decides completeness.
export const ADDRESS_SUBFIELD_KEYS = ['line1', 'line2', 'city', 'state', 'postal_code', 'country'] as const;
export type EditableAddressValue = Partial<Pick<MemberCustomFieldAddress, typeof ADDRESS_SUBFIELD_KEYS[number]>>;
export type EditableCustomFieldValue = string | EditableAddressValue;

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
    labels?: Array<{name: string; slug: string}> | null;
    newsletters?: Array<{id: string}> | null;
}

// Same shape as the import-members validator already used in this app.
const MEMBER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
            .map(label => ({name: label.name, slug: label.slug}))
            .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)),
        newsletters: (member.newsletters ?? [])
            .map(nl => nl.id)
            .sort()
    };
}

/**
 * The custom field values from a member's `custom_fields` payload, normalized:
 * strings trimmed, address sub-fields trimmed with empty ones dropped, and
 * empty values ('' / {} / null) collapsing to an absent key — so "no value"
 * reads identically however it's represented. Feeds the read-only value rows
 * and seeds the per-field editor.
 */
export function getEditableCustomFieldValues(customFields: Record<string, unknown> | null | undefined): Record<string, EditableCustomFieldValue> {
    const values: Record<string, EditableCustomFieldValue> = {};
    for (const [key, value] of Object.entries(customFields ?? {})) {
        if (typeof value === 'string' && value.trim() !== '') {
            values[key] = value.trim();
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const address = normalizeAddressValue(value as Record<string, unknown>);
            if (address) {
                values[key] = address;
            }
        }
    }
    return values;
}

/**
 * An address value reduced to its known sub-fields, trimmed, with empty
 * sub-fields dropped. Undefined when nothing remains, so an all-blank address
 * normalizes to "no value" exactly like an empty string does.
 */
function normalizeAddressValue(value: Record<string, unknown>): EditableAddressValue | undefined {
    const address: EditableAddressValue = {};
    for (const subfield of ADDRESS_SUBFIELD_KEYS) {
        const subvalue = value[subfield];
        if (typeof subvalue === 'string' && subvalue.trim() !== '') {
            address[subfield] = subvalue.trim();
        }
    }
    return Object.keys(address).length ? address : undefined;
}

/**
 * Add or remove a newsletter id from the subscribed set, preserving sort order.
 * Idempotent by construction so a repeated toggle round-trips to no change.
 */
export function toggleMemberNewsletter(subscribedIds: string[], newsletterId: string): string[] {
    if (subscribedIds.includes(newsletterId)) {
        return subscribedIds.filter(id => id !== newsletterId);
    }
    return [...subscribedIds, newsletterId].sort();
}

/** Client-side email sanity check for the save gate; the server remains authoritative. */
export function isValidMemberEmail(email: string): boolean {
    return MEMBER_EMAIL_REGEX.test(email.trim());
}

/**
 * Message to render under the email field. Gated on `touched` so the empty
 * initial state on the New member screen (or an email cleared briefly during
 * a paste) doesn't render as an error the user hasn't provoked yet. Ember's
 * validator runs on save-attempt for the same reason
 * (`ghost/admin/app/validators/member.js:15`).
 */
export function getEmailErrorMessage(email: string, touched: boolean): string | null {
    if (!touched) {
        return null;
    }
    if (email.trim() === '') {
        return 'Email is required.';
    }
    if (!isValidMemberEmail(email)) {
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
    emailSuppression: Member['email_suppression']
): MemberSuppressionInfo | null {
    if (!emailSuppression?.suppressed) {
        return null;
    }
    const info = emailSuppression.info;
    if (!info) {
        return {label: null};
    }
    const {reason, timestamp} = info;
    const date = moment(new Date(timestamp)).format('D MMM YYYY');
    switch (reason) {
    case 'fail':
        return {reason, label: `Bounced on ${date}`};
    case 'spam':
        return {reason, label: `Flagged as spam on ${date}`};
    default:
        return {reason, label: `Email disabled on ${date}`};
    }
}

/**
 * Whether the newsletter section of the member form should render, gated on the
 * `editor_default_email_recipients` setting the same way Ember does: only
 * `'disabled'` hides it. Treating `undefined`/`null` as "show" biases for the
 * common case (sites with emails enabled see no flash) at the cost of a possible
 * flash-out on disabled sites when the setting finishes loading.
 */
/**
 * Newsletters that Ember auto-subscribes a new member to on save. Ports
 * `gh-member-settings-form.js:233-241`: keep only newsletters that opt in
 * via `subscribe_on_signup` AND are visible to member-tier subscribers
 * (`visibility: 'members'`). The result feeds the create-screen draft so
 * the toggles render as CHECKED — matching what the admin would see if
 * they'd opened the Ember screen — and the same list is included in the
 * POST payload so the server never has to fall back to its own default.
 */
export function getDefaultNewsletterIdsForNewMember(
    newsletters: Array<{id: string; subscribe_on_signup?: boolean; visibility?: string | null}> | undefined | null
): string[] {
    if (!newsletters) {
        return [];
    }
    return newsletters
        .filter(nl => nl.subscribe_on_signup === true && nl.visibility === 'members')
        .map(nl => nl.id);
}

export function getMemberNewslettersUiEnabled(editorDefaultEmailRecipients: string | null | undefined): boolean {
    return editorDefaultEmailRecipients !== 'disabled';
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
    serverBaseline: MemberEditableFields
): EditMemberData {
    const normalized = normalizeDraftForComparison(draft);
    const payload: EditMemberData = {
        id,
        name: normalized.name,
        email: normalized.email,
        note: normalized.note,
        labels: normalized.labels
    };
    if (!dequal(normalized.newsletters, serverBaseline.newsletters)) {
        payload.newsletters = normalized.newsletters.map(nlId => ({id: nlId}));
    }
    return payload;
}

/**
 * The save payload for ONE custom field, from the per-field editor. Merge
 * semantics do the rest: only this key is touched, `null` clears it, and an
 * address is sent whole (the merge is per field, not per sub-field).
 */
export function buildCustomFieldSavePayload(
    memberId: string,
    fieldKey: string,
    value: EditableCustomFieldValue
): EditMemberData {
    const normalized = typeof value === 'string'
        ? (value.trim() || undefined)
        : normalizeAddressValue(value);
    return {id: memberId, custom_fields: {[fieldKey]: normalized ?? null}};
}

// What to do about a missing or malformed address sub-field, in plain words.
// Schema messages (zod's "Invalid input: expected string…") never reach the
// screen — the schema decides WHETHER a value is valid, this copy says what
// to do about it.
const ADDRESS_SUBFIELD_MESSAGES: Record<typeof ADDRESS_SUBFIELD_KEYS[number], string> = {
    line1: 'Enter a street address.',
    line2: 'Enter a shorter address line.',
    city: 'Enter a city.',
    state: 'Enter a shorter state.',
    postal_code: 'Enter a postal code.',
    country: 'Enter a 2-letter country code, like US.'
};

// Required free-text sub-fields fail as too_small when missing and too_big when
// over the limit, but their copy above only fits the missing case — so an
// over-long value defers to the length message. The others already read
// correctly for their over-long case (line2/state say "shorter"; country is a
// format hint that fits a too-long code too), so they keep their copy.
const ADDRESS_SUBFIELDS_LENGTH_ON_TOO_BIG: ReadonlySet<string> = new Set(['line1', 'city', 'postal_code']);

/** A schema issue translated into copy a person can act on. */
function friendlyValidationMessage(
    field: MemberCustomField,
    issue: {code?: string; path: ReadonlyArray<PropertyKey>; maximum?: unknown}
): string {
    const tooBigMaximum = issue.code === 'too_big' && typeof issue.maximum === 'number' ? issue.maximum : undefined;
    if (field.type === 'address') {
        const subfield = issue.path[0];
        if (typeof subfield === 'string') {
            if (tooBigMaximum !== undefined && ADDRESS_SUBFIELDS_LENGTH_ON_TOO_BIG.has(subfield)) {
                return `Use ${tooBigMaximum} characters or fewer.`;
            }
            if (subfield in ADDRESS_SUBFIELD_MESSAGES) {
                return ADDRESS_SUBFIELD_MESSAGES[subfield as typeof ADDRESS_SUBFIELD_KEYS[number]];
            }
        }
    }
    if (tooBigMaximum !== undefined) {
        return `Use ${tooBigMaximum} characters or fewer.`;
    }
    // The remaining scalar rule is long_text's byte bound; characters are the
    // unit a person can reason about, bytes are not.
    return 'This text is too long to save. Shorten it a little.';
}

/**
 * Client-side validation of custom field values against the shared catalog
 * schemas — the same schemas the server enforces, so the two can never
 * disagree on substance. Returns messages keyed by `fieldKey` (scalar) or
 * `fieldKey.subfield` (composite sub-field), matching the path shape of the
 * server's 422 `property` so both error sources render through one map.
 * Cleared/empty values are always valid — fields are optional.
 */
export function getCustomFieldValidationErrors(
    draftCustomFields: Record<string, EditableCustomFieldValue>,
    fields: MemberCustomField[]
): Record<string, string> {
    const errors: Record<string, string> = {};
    const values = getEditableCustomFieldValues(draftCustomFields);
    for (const field of fields) {
        const value = values[field.key];
        if (value === undefined) {
            continue;
        }
        // Runtime guard for a future type this build doesn't know; the server
        // remains authoritative for those.
        const definition = MEMBER_CUSTOM_FIELD_TYPES[field.type];
        if (!definition) {
            continue;
        }
        const result = definition.value.safeParse(value);
        if (!result.success) {
            for (const issue of result.error.issues) {
                const key = [field.key, ...issue.path].join('.');
                errors[key] ??= friendlyValidationMessage(field, issue);
            }
        }
    }
    return errors;
}

/**
 * Field-level errors from a failed member save. The values service names the
 * offending field in `property` as `custom_fields.<key>[.<subfield>]` with the
 * reason in `context` (see members-custom-fields/values-service.ts), so the
 * message can be rendered under the exact input it belongs to. Returns
 * undefined when the failure isn't custom-fields shaped, letting callers fall
 * back to the generic toast.
 */
export function parseCustomFieldServerErrors(error: unknown): Record<string, string> | undefined {
    const data = (error as {data?: {errors?: Array<{property?: string | null; context?: string | null; message?: string | null}>}} | null)?.data;
    const errors: Record<string, string> = {};
    for (const apiError of data?.errors ?? []) {
        if (apiError.property?.startsWith('custom_fields.')) {
            errors[apiError.property.slice('custom_fields.'.length)] = apiError.context || apiError.message || 'Invalid value.';
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
    known: ReadonlyMap<string, MemberEditableLabel>
): MemberEditableLabel[] {
    return slugs.map(slug => known.get(slug) ?? {name: slug, slug});
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
        newsletters: draft.newsletters
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
    serverBaseline: MemberEditableFields | undefined
): boolean {
    return !draft || (!!serverBaseline && dequal(normalizeDraftForComparison(draft), serverBaseline));
}
