const EmailSpamComplaintEvent = require('../../../../core/server/models/email-spam-complaint-event');
const assert = require('assert/strict');

describe('EmailSpamComplaintEvent', function () {
    describe('destroy', function () {
        it('rejects', async function () {
            let threw = false;
            try {
                await EmailSpamComplaintEvent.destroy({id: 'blah'});
                threw = false;
            } catch (err) {
                threw = true;
            } finally {
                assert(threw);
            }
        });
    });

    describe('edit', function () {
        it('rejects', async function () {
            let threw = false;
            try {
                await EmailSpamComplaintEvent.edit({reason: 'fuck'}, {id: 'blah'});
                threw = false;
            } catch (err) {
                threw = true;
            } finally {
                assert(threw);
            }
        });
    });
});
