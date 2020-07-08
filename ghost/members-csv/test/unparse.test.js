const should = require('should');
const path = require('path');
const {readCSV} = require('../lib/parse');
const unparse = require('../lib/unparse');
const csvPath = path.join(__dirname, '/fixtures/');

describe('unparse', function () {
    it('serializes json to CSV and adds standard members fields', async function () {
        const filePath = path.join(csvPath, 'single-column-with-header.csv');

        const json = await readCSV({
            path: filePath,
            columnsToExtract: [{name: 'email', lookup: /email/i}]
        });

        const result = unparse(json);

        should.exist(result);

        const expected = `id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels\r\n,jbloggs@example.com,,,,,,,,\r\n,test@example.com,,,,,,,,`;
        should.equal(result, expected);
    });
});
