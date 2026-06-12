import {describe, expect, it} from 'vitest';
import {
    formValuesToEditMemberPayload,
    formValuesToNewMemberPayload,
    memberFormSchema,
    memberToFormValues,
    sortLabels,
    sortNewsletterIds
} from './member-form-schema';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {MemberFormValues} from './member-form-schema';

function validValues(overrides: Partial<MemberFormValues> = {}): MemberFormValues {
    return {
        name: 'Test Member',
        email: 'member@example.com',
        note: '',
        labels: [],
        newsletterIds: [],
        ...overrides
    };
}

function firstError(values: MemberFormValues, field: keyof MemberFormValues) {
    const result = memberFormSchema.safeParse(values);
    if (result.success) {
        return undefined;
    }
    return result.error.issues.find(issue => issue.path[0] === field)?.message;
}

describe('memberFormSchema', () => {
    it('accepts valid values', () => {
        expect(memberFormSchema.safeParse(validValues()).success).toBe(true);
    });

    it('mirrors the Ember validator messages', () => {
        expect(firstError(validValues({name: 'a'.repeat(192)}), 'name'))
            .toBe('Name cannot be longer than 191 characters.');
        expect(firstError(validValues({email: ''}), 'email'))
            .toBe('Please enter an email.');
        expect(firstError(validValues({email: 'invalid-email-address'}), 'email'))
            .toBe('Invalid Email.');
        expect(firstError(validValues({email: `${'a'.repeat(190)}@example.com`}), 'email'))
            .toBe('Email cannot be longer than 191 characters.');
        expect(firstError(validValues({note: 'a'.repeat(501)}), 'note'))
            .toBe('Note is too long.');
    });

    it('allows an empty name and a 500 character note', () => {
        expect(memberFormSchema.safeParse(validValues({name: '', note: 'a'.repeat(500)})).success).toBe(true);
    });

    it('trims the email before validating', () => {
        const result = memberFormSchema.safeParse(validValues({email: '  member@example.com  '}));
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.email).toBe('member@example.com');
        }
    });
});

describe('memberToFormValues', () => {
    const member = {
        id: 'member-1',
        name: 'Jane',
        email: 'jane@example.com',
        note: 'a note',
        labels: [
            {id: 'l2', name: 'Zeta', slug: 'zeta', created_at: ''},
            {id: 'l1', name: 'alpha', slug: 'alpha', created_at: ''}
        ],
        newsletters: [
            {id: 'n2', uuid: '', name: 'Two', slug: 'two', status: 'active'},
            {id: 'n1', uuid: '', name: 'One', slug: 'one', status: 'active'}
        ]
    } as unknown as Member;

    it('maps a member to form values with sorted labels and newsletter ids', () => {
        const values = memberToFormValues(member);

        expect(values.name).toBe('Jane');
        expect(values.email).toBe('jane@example.com');
        expect(values.note).toBe('a note');
        expect(values.labels.map(label => label.name)).toEqual(['alpha', 'Zeta']);
        expect(values.newsletterIds).toEqual(['n1', 'n2']);
    });

    it('defaults to empty values for a new member', () => {
        expect(memberToFormValues()).toEqual({
            name: '',
            email: '',
            note: '',
            labels: [],
            newsletterIds: []
        });
    });

    it('uses the default newsletter ids for a new member only', () => {
        expect(memberToFormValues(undefined, ['n9', 'n1']).newsletterIds).toEqual(['n1', 'n9']);
        expect(memberToFormValues(member, ['n9']).newsletterIds).toEqual(['n1', 'n2']);
    });
});

describe('sorting helpers', () => {
    it('sorts labels by name ignoring punctuation', () => {
        const sorted = sortLabels([
            {name: 'beta'},
            {name: '#alpha'}
        ]);
        expect(sorted.map(label => label.name)).toEqual(['#alpha', 'beta']);
    });

    it('does not mutate the input arrays', () => {
        const labels = [{name: 'b'}, {name: 'a'}];
        const ids = ['2', '1'];
        sortLabels(labels);
        sortNewsletterIds(ids);
        expect(labels.map(label => label.name)).toEqual(['b', 'a']);
        expect(ids).toEqual(['2', '1']);
    });
});

describe('formValuesToNewMemberPayload', () => {
    it('trims scratch fields and nulls empty optionals', () => {
        const payload = formValuesToNewMemberPayload(validValues({
            name: '  Jane  ',
            email: ' jane@example.com ',
            note: '   '
        }));

        expect(payload.name).toBe('Jane');
        expect(payload.email).toBe('jane@example.com');
        expect(payload.note).toBeNull();
    });

    it('sends existing labels with ids and new labels as {name} only', () => {
        const payload = formValuesToNewMemberPayload(validValues({
            labels: [
                {id: 'l1', name: 'Existing', slug: 'existing'},
                {name: 'Brand new'}
            ]
        }));

        expect(payload.labels).toEqual([
            {id: 'l1', name: 'Existing', slug: 'existing'},
            {name: 'Brand new'}
        ]);
    });

    it('maps newsletter ids to {id} objects', () => {
        const payload = formValuesToNewMemberPayload(validValues({newsletterIds: ['n1', 'n2']}));
        expect(payload.newsletters).toEqual([{id: 'n1'}, {id: 'n2'}]);
    });
});

describe('formValuesToEditMemberPayload', () => {
    it('includes the member id', () => {
        const payload = formValuesToEditMemberPayload('member-1', validValues());
        expect(payload.id).toBe('member-1');
        expect(payload.email).toBe('member@example.com');
    });
});
