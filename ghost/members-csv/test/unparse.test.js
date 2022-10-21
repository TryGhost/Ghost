const should = require('should');
const {unparse} = require('../index');

describe('unparse', function () {
    it('serializes json to CSV and adds standard members fields with no explicit columns parameter', async function () {
        const json = [{
            email: 'email@example.com',
            name: 'Sam Memberino',
            note: 'Early supporter'
        }];

        const result = unparse(json);

        should.exist(result);

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,products\r\n,email@example.com,Sam Memberino,Early supporter,,,,,,,`;
        should.equal(result, expected);
    });

    it('maps the subscribed property to subscribed_to_emails', function () {
        const json = [{
            email: 'do-not-email-me@email.com',
            subscribed: false
        }];

        const columns = [
            'email', 'subscribed'
        ];

        const result = unparse(json, columns);

        const expected = `email,subscribed_to_emails\r\ndo-not-email-me@email.com,false`;

        should.equal(result, expected);
    });
});
