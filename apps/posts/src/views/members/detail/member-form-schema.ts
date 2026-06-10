import {z} from 'zod';
import type {Member, MemberEditPayload, MemberLabelPayload, NewMember} from '@tryghost/admin-x-framework/api/members';

/**
 * Validation mirrors the Ember admin's validators/member.js (same messages).
 */
export const memberFormSchema = z.object({
    name: z.string()
        .max(191, 'Name cannot be longer than 191 characters.'),
    email: z.string().trim()
        .min(1, 'Please enter an email.')
        .email('Invalid Email.')
        .max(191, 'Email cannot be longer than 191 characters.'),
    note: z.string()
        .max(500, 'Note is too long.'),
    labels: z.array(z.object({
        id: z.string().optional(),
        name: z.string(),
        slug: z.string().optional()
    })),
    newsletterIds: z.array(z.string())
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
export type MemberFormLabel = MemberFormValues['labels'][number];

/**
 * Labels and newsletter ids are kept sorted so that removing and re-adding
 * the same item leaves the form clean (react-hook-form's isDirty does a deep
 * compare against the default values; the Ember controller sorted both lists
 * for the same reason).
 */
export function sortLabels(labels: MemberFormLabel[]): MemberFormLabel[] {
    return [...labels].sort((a, b) => a.name.localeCompare(b.name, undefined, {ignorePunctuation: true}));
}

export function sortNewsletterIds(ids: string[]): string[] {
    return [...ids].sort();
}

export function memberToFormValues(member?: Member, defaultNewsletterIds: string[] = []): MemberFormValues {
    return {
        name: member?.name ?? '',
        email: member?.email ?? '',
        note: member?.note ?? '',
        labels: sortLabels((member?.labels ?? []).map(label => ({
            id: label.id,
            name: label.name,
            slug: label.slug
        }))),
        newsletterIds: sortNewsletterIds(member ? (member.newsletters ?? []).map(n => n.id) : defaultNewsletterIds)
    };
}

function trimmedOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function labelsToPayload(labels: MemberFormLabel[]): MemberLabelPayload[] {
    return labels.map((label) => {
        if (label.id) {
            return {id: label.id, name: label.name, slug: label.slug};
        }
        // labels created from the typeahead are sent as {name} and created
        // server-side (Ember's updateLabels semantics)
        return {name: label.name};
    });
}

export function formValuesToNewMemberPayload(values: MemberFormValues): NewMember {
    return {
        name: trimmedOrNull(values.name),
        email: values.email.trim(),
        note: trimmedOrNull(values.note),
        labels: labelsToPayload(values.labels),
        newsletters: values.newsletterIds.map(id => ({id}))
    };
}

export function formValuesToEditMemberPayload(memberId: string, values: MemberFormValues): MemberEditPayload {
    return {
        id: memberId,
        ...formValuesToNewMemberPayload(values)
    };
}
