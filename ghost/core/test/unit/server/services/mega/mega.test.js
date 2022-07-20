const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const labs = require('../../../../../core/shared/labs');

const {addEmail, _partitionMembersBySegment, _getEmailMemberRows, _transformEmailRecipientFilter, _getFromAddress, _getReplyToAddress} = require('../../../../../core/server/services/mega/mega');
const membersService = require('../../../../../core/server/services/members');

describe('MEGA', function () {
    describe('addEmail', function () {
        afterEach(function () {
            sinon.restore();
        });

        // via transformEmailRecipientFilter
        it('throws when "none" is used as a email_recipient_filter', async function () {
            const postModel = {
                get: sinon.stub().returns('none'),
                relations: {},
                getLazyRelation: sinon.stub().returns({
                    get: sinon.stub().returns('active')
                })
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Cannot send email to "none" email_segment');
            }
        });

        it('throws when sending to an archived newsletter', async function () {
            const postModel = {
                get: sinon.stub().returns('all'),
                relations: {},
                getLazyRelation: sinon.stub().returns({
                    get: sinon.stub().returns('archived')
                })
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Cannot send email to archived newsletters');
            }
        });

        // via transformEmailRecipientFilter
        it('throws when "public" is used as newsletter.visibility', async function () {
            const newsletterGetter = sinon.stub();
            newsletterGetter.withArgs('status').returns('active');
            newsletterGetter.withArgs('visibility').returns('public');

            const postModel = {
                get: sinon.stub().returns('status:free'),
                relations: {},
                getLazyRelation: sinon.stub().returns({
                    get: newsletterGetter
                })
            };
            sinon.stub(labs, 'isSet').returns(true);

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Unexpected visibility value "public". Use one of the valid: "members", "paid".');
            }
        });
    });

    describe('transformEmailRecipientFilter', function () {
        it('public newsletter', function () {
            const newsletterGetter = sinon.stub();
            newsletterGetter.withArgs('status').returns('active');
            newsletterGetter.withArgs('visibility').returns('members');

            const transformedFilter = _transformEmailRecipientFilter({id: 'test', get: newsletterGetter}, 'status:free,status:-free', 'field');
            transformedFilter.should.equal('newsletters.id:test+(status:free,status:-free)');
        });

        it('paid-only newsletter', function () {
            const newsletterGetter = sinon.stub();
            newsletterGetter.withArgs('status').returns('active');
            newsletterGetter.withArgs('visibility').returns('paid');

            const transformedFilter = _transformEmailRecipientFilter({id: 'test', get: newsletterGetter}, 'status:free,status:-free', 'field');
            transformedFilter.should.equal('newsletters.id:test+(status:free,status:-free)+status:-free');
        });
    });

    describe('getEmailMemberRows', function () {
        it('getEmailMemberRows throws when "none" is used as a recipient_filter', async function () {
            const newsletterGetter = sinon.stub();
            newsletterGetter.withArgs('status').returns('active');
            newsletterGetter.withArgs('visibility').returns('members');

            const emailModel = {
                get: sinon.stub().returns('none'),
                relations: {},
                getLazyRelation: sinon.stub().returns({
                    id: 'test',
                    newsletterGetter
                })
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

    describe('getFromAddress', function () {
        it('Returns only the email when only fromAddress is specified', function () {
            should(_getFromAddress('', 'test@example.com')).eql('test@example.com');
        });

        it('Adds a sender name when it\'s specified', function () {
            should(_getFromAddress(' Unnamed sender!! ', 'test@example.com')).eql('" Unnamed sender!! "<test@example.com>');
        });

        it('Overwrites the fromAddress when the domain is localhost', function () {
            should(_getFromAddress('Test', 'test@localhost')).eql('"Test"<localhost@example.com>');
        });
        it('Overwrites the fromAddress when the domain is ghost.local', function () {
            should(_getFromAddress('123', '456@ghost.local')).eql('"123"<localhost@example.com>');
        });
    });

    describe('getReplyToAddress', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('Returns the from address by default', function () {
            should(_getReplyToAddress('test@example.com')).eql('test@example.com');
            should(_getReplyToAddress('test2@example.com', 'invalid')).eql('test2@example.com');
            should(_getReplyToAddress('test3@example.com', 'newsletter')).eql('test3@example.com');
        });

        it('Returns the support email when the option is set to "support"', function () {
            sinon.stub(membersService.config, 'getEmailSupportAddress').returns('support@example.com');
            should(_getReplyToAddress('test4@example.com', 'support')).eql('support@example.com');
        });
    });
});
