import assert from 'node:assert/strict';
import buildCompletionEmail from '../../../../../../../core/server/services/members/import-export/import/members-import-email';
import type {ImportErrorRow} from '../../../../../../../core/server/services/members/import-export/import/member-import-row';

// The completion email is exercised end-to-end by the deferred parity test; this pins
// what is only presentation and awkward to read off an email at the API boundary: the
// humanising of raw ORM validation errors, and the shaping of failed rows into the
// import-shaped error report (its own serialiser, separate from the export CSV).
describe('members import completion email', function () {
    const urlFor = () => 'http://localhost/';

    const build = (errors: ImportErrorRow[]) => buildCompletionEmail({
        result: {imported: 0, errors},
        recipient: 'owner@example.com',
        labelName: 'Import 2026-01-01 00:00',
        importLabel: null,
        urlFor
    });

    it('names the attachment after the import label', function () {
        const email = build([]);
        assert.equal(email.attachments[0].filename, 'Import 2026-01-01 00:00 - Errors.csv');
        assert.equal(email.attachments[0].contentType, 'text/csv');
    });

    it('titles the email by whether anything imported', function () {
        assert.match(build([]).subject, /unsuccessful/);

        const someImported = buildCompletionEmail({
            result: {imported: 1, errors: []},
            recipient: 'owner@example.com',
            labelName: 'Import 2026-01-01 00:00',
            importLabel: null,
            urlFor
        });
        assert.match(someImported.subject, /complete/);
    });

    it('rewrites raw ORM validation errors into human copy', function () {
        const email = build([
            {email: '', labels: [], error: 'Value in [members.email] cannot be blank.'},
            {email: 'bad', labels: [], error: 'Validation (isEmail) failed for email'},
            {email: 'x', labels: [], error: 'No such customer: cus_123'}
        ]);
        const report = email.attachments[0].content;

        assert.ok(report.includes('Missing email address'), 'blank email humanised');
        assert.ok(report.includes('Invalid email address'), 'isEmail failure humanised');
        assert.ok(report.includes('Could not find Stripe customer'), 'stripe customer humanised');

        assert.equal(report.includes('members.email'), false, 'raw ORM message not leaked');
        assert.equal(report.includes('isEmail'), false, 'raw ORM message not leaked');
    });

    it('shapes a failed row into the import-shaped error columns', function () {
        const report = build([{
            email: 'x@example.com', name: 'Sam', note: 'a note',
            subscribed: false, complimentary_plan: true, stripe_customer_id: 'cus_1',
            labels: [{name: 'vip'}, {name: 'gold'}], gift_id: 'gift_1',
            error: 'Validation (isEmail) failed for email'
        }]).attachments[0].content;

        const [header, row] = report.split('\r\n');
        assert.equal(header, 'id,email,name,note,subscribed_to_emails,complimentary_plan,stripe_customer_id,created_at,deleted_at,labels,tiers,gift_id,error');
        // subscribed -> subscribed_to_emails, labels joined, gift_id echoed, error humanised
        assert.equal(row, ',x@example.com,Sam,a note,false,true,cus_1,,,"vip,gold",,gift_1,Invalid email address');
    });

    it('escapes CSV-injection characters so a spreadsheet cannot run them', function () {
        const report = build([{email: 'x@example.com', name: '=1+2', labels: [], error: 'nope'}]).attachments[0].content;
        const row = report.split('\r\n')[1];
        assert.ok(row.includes(`"'=1+2"`), 'formula-leading value is quoted and apostrophe-escaped');
    });
});
