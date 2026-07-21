import assert from 'node:assert/strict';
import {unparse} from '../../../../../../core/server/services/members/csv';

describe('unparse', function () {
    it('serializes json to CSV and adds standard members fields with no explicit columns parameter', async function () {
        const json = [{
            email: 'email@example.com',
            name: 'Sam Memberino',
            note: 'Early supporter'
        }];

        const result = unparse(json);

        assert.ok(result);

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id\r\n,email@example.com,Sam Memberino,Early supporter,,,,,,,,`;
        assert.equal(result, expected);
    });

    it('takes complimentary_plan from the comped property', function () {
        const json = [{
            email: 'comped@example.com',
            comped: true
        }];

        const result = unparse(json, ['email', 'complimentary_plan']);

        assert.equal(result, 'email,complimentary_plan\r\ncomped@example.com,true');
    });

    it('takes stripe_customer_id from the first subscription customer', function () {
        const json = [{
            email: 'paid@example.com',
            subscriptions: [{customer: {id: 'cus_from_subscription'}}],
            stripe_customer_id: 'cus_ignored'
        }];

        const result = unparse(json, ['email', 'stripe_customer_id']);

        assert.equal(result, 'email,stripe_customer_id\r\npaid@example.com,cus_from_subscription');
    });

    it('falls back to stripe_customer_id when the subscription has no customer', function () {
        const json = [{
            email: 'paid@example.com',
            subscriptions: [{}],
            stripe_customer_id: 'cus_fallback'
        }];

        const result = unparse(json, ['email', 'stripe_customer_id']);

        assert.equal(result, 'email,stripe_customer_id\r\npaid@example.com,cus_fallback');
    });

    it('does not leak the error column into a later call', function () {
        unparse([{email: 'failed@example.com', error: 'things went south here!'}]);

        const result = unparse([{email: 'fine@example.com'}]);

        assert.ok(!result.split('\r\n')[0].split(',').includes('error'));
    });

    it('maps the subscribed property to subscribed_to_emails', function () {
        const json = [{
            email: 'do-not-email-me@email.com',
            subscribed_to_emails: false
        }];

        const columns = [
            'email', 'subscribed'
        ];

        const result = unparse(json, columns);

        const expected = `email,subscribed_to_emails\r\ndo-not-email-me@email.com,false`;

        assert.equal(result, expected);
    });

    it('adds an error column to serialized CSV when present in columns and as a property', function () {
        const json = [{
            email: 'member-email@email.com',
            error: 'things went south here!'
        }];
        const columns = [
            'email', 'error'
        ];

        const result = unparse(json, columns);
        const expected = `email,error\r\nmember-email@email.com,things went south here!`;
        assert.equal(result, expected);
    });

    it('adds an error column automatically even if not present in columns', function () {
        const json = [{
            email: 'member-email@email.com',
            error: 'things went south here!'
        }];
        const columns = [
            'email'
        ];

        const result = unparse(json, columns);
        const expected = `email,error\r\nmember-email@email.com,things went south here!`;
        assert.equal(result, expected);
    });

    it('handles labels as strings and as objects', function () {
        const json = [{
            email: 'member-email@email.com',
            labels: 'member-email-label'
        }, {
            email: 'second-member-email@email.com',
            labels: [{
                name: 'second member label'
            }]
        }, {
            email: 'third-member-email@email.com',
            labels: ['banana, avocado']
        }];
        const columns = [
            'email', 'labels'
        ];

        const result = unparse(json, columns);
        const expected = `email,labels\r
member-email@email.com,member-email-label\r
second-member-email@email.com,second member label\r
third-member-email@email.com,"banana, avocado"`;
        assert.equal(result, expected);
    });

    it('handles the tiers property serialization', function () {
        const json = [{
            email: 'member-email@email.com',
            tiers: [{
                name: 'Bronze Level'
            }]
        }];

        const columns = [
            'email', 'tiers'
        ];

        const result = unparse(json, columns);
        const expected = `email,tiers\r\nmember-email@email.com,Bronze Level`;
        assert.equal(result, expected);
    });

    it('escapes fields starting with CSV injection characters', async function () {
        const json = [{
            email: 'email@example.com',
            name: '=1+2',
            note: 'Early supporter'
        }];

        const result = unparse(json);
        assert.ok(result);

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id\r\n,email@example.com,"'=1+2",Early supporter,,,,,,,,`;
        assert.equal(result, expected);
    });

    it('leaves CSV injection characters unescaped when escapeFormulae is off', async function () {
        const json = [{
            email: 'email@example.com',
            name: '=1+2',
            note: '-5'
        }];

        const result = unparse(json, undefined, {escapeFormulae: false});

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id\r\n,email@example.com,=1+2,-5,,,,,,,,`;
        assert.equal(result, expected);
    });

    it('escapes fields with CSV injection characters and quotes', async function () {
        const json = [{
            email: 'email@example.com',
            name: `=1+2'" `,
            note: 'Early supporter'
        }];

        const result = unparse(json);
        assert.ok(result);

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id\r\n,email@example.com,"'=1+2'"" ",Early supporter,,,,,,,,`;
        assert.equal(result, expected);
    });

    it('includes gift_id in default output when set on a row', function () {
        const json = [{
            email: 'gift@example.com',
            gift_id: 'gift123'
        }];

        const result = unparse(json);
        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id\r\n,gift@example.com,,,,,,,,,,gift123`;
        assert.equal(result, expected);
    });

    it('includes gift_id column in default output even when no row has a value', function () {
        const json = [{
            email: 'no-gift@example.com'
        }];

        const result = unparse(json);
        const header = result.split('\r\n')[0];
        assert.ok(header.split(',').includes('gift_id'));
    });

    it('omits gift_id when an explicit columns array does not include it', function () {
        const json = [{
            email: 'gift@example.com',
            gift_id: 'gift123'
        }];
        const columns = ['email'];

        const result = unparse(json, columns);
        const expected = `email\r\ngift@example.com`;
        assert.equal(result, expected);
    });

    it('serializes gift_id as empty when row has no gift_id', function () {
        const json = [{
            email: 'no-gift@example.com'
        }];
        const columns = ['email', 'gift_id'];

        const result = unparse(json, columns);
        const expected = `email,gift_id\r\nno-gift@example.com,`;
        assert.equal(result, expected);
    });
});
