import {dequal} from 'dequal';
import type {EditMemberData} from '@tryghost/admin-x-framework/api/members';

export interface MemberEditableFields {
    name: string;
    email: string;
    note: string;
}

// The members API returns null (not just undefined) for unset name/email/note,
// so accept both here rather than casting at the call sites.
interface MemberFieldSource {
    name?: string | null;
    email?: string | null;
    note?: string | null;
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
        note: member.note ?? ''
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

/** Build the `useEditMember` payload for the field edits in this slice. */
export function buildMemberFieldEditPayload(id: string, draft: MemberFieldSource): EditMemberData {
    const {name, email, note} = getMemberEditableSlice(draft);
    return {id, name, email, note};
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
