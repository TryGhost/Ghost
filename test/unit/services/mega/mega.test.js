const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const {addEmail, partitionMembersBySegment} = require('../../../../core/server/services/mega/mega');

describe('MEGA', function () {
    describe('addEmail', function () {
        it('addEmail throws when "free" or "paid" strings are used as a email_recipient_filter', async function () {
            const postModel = {
                get: sinon.stub().returns('free')
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(err instanceof errors.GhostError, true);
                err.message.should.equal('Unexpected email_recipient_filter value "free", expected an NQL equivalent');
            }
        });

        it('addEmail throws when "none" is used as a email_recipient_filter', async function () {
            const postModel = {
                get: sinon.stub().returns('none')
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(err instanceof errors.GhostError, true);
                err.message.should.equal('Cannot sent email to "none" email_recipient_filter');
            }
        });
    });

    describe('partitionMembersBySegment', function () {
        it('partition with no segments', function () {
            const members = [{
                name: 'Free Rish',
                status: 'free'
            }, {
                name: 'Free Matt',
                status: 'free'
            }, {
                name: 'Paid Daniel',
                status: 'paid'
            }];
            const segments = [];

            const partitions = partitionMembersBySegment(members, segments);

            partitions.unsegmented.length.should.equal(3);
            partitions.unsegmented[0].name.should.equal('Free Rish');
        });

        it('partition members with single segment', function () {
            const members = [{
                name: 'Free Rish',
                status: 'free'
            }, {
                name: 'Free Matt',
                status: 'free'
            }, {
                name: 'Paid Daniel',
                status: 'paid'
            }];
            const segments = ['status:free'];

            const partitions = partitionMembersBySegment(members, segments);

            should.exist(partitions['status:free']);
            partitions['status:free'].length.should.equal(2);
            partitions['status:free'][0].name.should.equal('Free Rish');
            partitions['status:free'][1].name.should.equal('Free Matt');

            should.exist(partitions.unsegmented);
            partitions.unsegmented.length.should.equal(1);
            partitions.unsegmented[0].name.should.equal('Paid Daniel');
        });

        it('partition members with two segments', function () {
            const members = [{
                name: 'Free Rish',
                status: 'free'
            }, {
                name: 'Free Matt',
                status: 'free'
            }, {
                name: 'Paid Daniel',
                status: 'paid'
            }];
            const segments = ['status:free', 'status:-free'];

            const partitions = partitionMembersBySegment(members, segments);

            should.exist(partitions['status:free']);
            partitions['status:free'].length.should.equal(2);
            partitions['status:free'][0].name.should.equal('Free Rish');
            partitions['status:free'][1].name.should.equal('Free Matt');

            should.exist(partitions['status:-free']);
            partitions['status:-free'].length.should.equal(1);
            partitions['status:-free'][0].name.should.equal('Paid Daniel');

            should.not.exist(partitions.unsegmented);
        });

        it('throws if unsupported segment has been used', function () {
            const members = [];

            const segments = ['not a valid segment'];

            should.throws(() => {
                partitionMembersBySegment(members, segments);
            }, errors.ValidationError);
        });
    });
});
