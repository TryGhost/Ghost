const assert = require('assert/strict');
const {unparse} = require('../index');

describe('unparse', function () {
    it('serializes json to CSV and adds standard members fields with no explicit columns parameter', async function () {
        const json = [{
            email: 'email@example.com',
            name: 'Sam Memberino',
            note: 'Early supporter'
        }];

        const result = unparse(json);

        assert.ok(result);

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers\r\n,email@example.com,Sam Memberino,Early supporter,false,,,,,,`;
        assert.equal(result, expected);
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
});
