import {dequal} from 'dequal';
import type {EditMemberData} from '@tryghost/admin-x-framework/api/members';

export interface MemberEditableLabel {
    name: string;
    slug: string;
}

export interface MemberEditableFields {
    name: string;
    email: string;
    note: string;
    labels: MemberEditableLabel[];
}

// The members API returns null (not just undefined) for unset name/email/note,
// so accept both here rather than casting at the call sites.
interface MemberFieldSource {
    name?: string | null;
    email?: string | null;
    note?: string | null;
    labels?: Array<{name: string; slug: string}> | null;
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
            .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    };
}

/** Client-side email sanity check for the save gate; the server remains authoritative. */
export function isValidMemberEmail(email: string): boolean {
    return MEMBER_EMAIL_REGEX.test(email.trim());
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
 * sent as {name, slug}; the server matches existing labels case-insensitively by
 * name and creates any that are missing.
 */
export function buildMemberFieldEditPayload(id: string, draft: MemberFieldSource): EditMemberData {
    const {name, email, note, labels} = getMemberEditableSlice(draft);
    return {id, name, email, note, labels};
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
    return !draft || (!!serverBaseline && dequal(getMemberEditableSlice(draft), serverBaseline));
}
