const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const {addEmail, _partitionMembersBySegment, _getEmailMemberRows, _transformEmailRecipientFilter} = require('../../../../../core/server/services/mega/mega');

describe('MEGA', function () {
    describe('addEmail', function () {
        // via transformEmailRecipientFilter
        it('throws when "free" or "paid" strings are used as a email_recipient_filter', async function () {
            const postModel = {
                get: sinon.stub().returns('free')
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Unexpected email_recipient_filter value "free", expected an NQL equivalent');
            }
        });

        // via transformEmailRecipientFilter
        it('throws when "none" is used as a email_recipient_filter', async function () {
            const postModel = {
                get: sinon.stub().returns('none')
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Cannot send email to "none" email_recipient_filter');
            }
        });
    });

    describe('transformEmailRecipientFilter', function () {
        it('enforces subscribed:true with correct operator precedence', function () {
            const transformedFilter = _transformEmailRecipientFilter('status:free,status:-free');
            transformedFilter.should.equal('subscribed:true+(status:free,status:-free)');
        });
    });

    describe('getEmailMemberRows', function () {
        it('addEmail throws when "free" or "paid" strings are used as a recipient_filter', async function () {
            const emailModel = {
                get: sinon.stub().returns('paid')
            };

            try {
                await _getEmailMemberRows({emailModel});
                should.fail('getEmailMemberRows did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Unexpected recipient_filter value "paid", expected an NQL equivalent');
            }
        });

        it('addEmail throws when "none" is used as a recipient_filter', async function () {
            const emailModel = {
                get: sinon.stub().returns('none')
            };

            try {
                await _getEmailMemberRows({emailModel});
                should.fail('getEmailMemberRows did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Cannot send email to "none" recipient_filter');
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

            const partitions = _partitionMembersBySegment(members, segments);

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

            const partitions = _partitionMembersBySegment(members, segments);

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

            const partitions = _partitionMembersBySegment(members, segments);

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
                _partitionMembersBySegment(members, segments);
            }, errors.ValidationError);
        });
    });
});
