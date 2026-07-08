import moment from 'moment-timezone';
import {dequal} from 'dequal';
import type {EditMemberData, Member} from '@tryghost/admin-x-framework/api/members';

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
