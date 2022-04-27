const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const labs = require('../../../../../core/shared/labs');

const {addEmail, _partitionMembersBySegment, _getEmailMemberRows, _transformEmailRecipientFilter, handleUnsubscribeRequest, _getFromAddress, _getReplyToAddress} = require('../../../../../core/server/services/mega/mega');
const membersService = require('../../../../../core/server/services/members');

describe('MEGA', function () {
    describe('addEmail', function () {
        afterEach(function () {
            sinon.restore();
        });

        // via transformEmailRecipientFilter
        it('throws when "free" or "paid" strings are used as a email_recipient_filter', async function () {
            const postModel = {
                get: sinon.stub().returns('free'),
                related: sinon.stub().returns({
                    fetch: sinon.stub().returns(null)
                })
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
                get: sinon.stub().returns('none'),
                related: sinon.stub().returns({
                    fetch: sinon.stub().returns(null)
                })
            };

            try {
                await addEmail(postModel);
                should.fail('addEmail did not throw');
            } catch (err) {
                should.equal(errors.utils.isGhostError(err), true);
                err.message.should.equal('Cannot send email to "none" email_recipient_filter');
            }
        });

        // via transformEmailRecipientFilter
        it('throws when "public" is used as newsletter.visibility', async function () {
            const postModel = {
                get: sinon.stub().returns('status:free'),
                fetch: sinon.stub().returns(Promise.resolve({
                    get: () => 'public'
                }))
            };
            postModel.related = sinon.stub().returns(postModel);
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
        it('enforces subscribed:true with correct operator precedence', function () {
            const transformedFilter = _transformEmailRecipientFilter('status:free,status:-free');
            transformedFilter.should.equal('subscribed:true+(status:free,status:-free)');
        });

        it('doesn\'t enforce subscribed:true when sending an email to a newsletter', function () {
            const transformedFilter = _transformEmailRecipientFilter('status:free,status:-free', {}, {id: 'test', get: () => 'members'});
            transformedFilter.should.equal('newsletters.id:test+(status:free,status:-free)');
        });

        it('combines successfully with the newsletter paid-only visibility', function () {
            const transformedFilter = _transformEmailRecipientFilter('status:free,status:-free', {}, {id: 'test', get: () => 'paid'});
            transformedFilter.should.equal('newsletters.id:test+(status:free,status:-free)+status:-free');
        });
    });

    describe('handleUnsubscribeRequest', function () {
        const updateStub = sinon.stub();
        beforeEach(function () {
            updateStub.returns({
                toJSON: () => {
                    return {};
                }
            });
            sinon.stub(membersService, 'api').get(() => {
                return {
                    members: {
                        get: () => {
                            return {
                                id: 'id-1',
                                name: 'Jamie'
                            };
                        },
                        update: updateStub
                    }
                };
            });
        });

        it('unsubscribes from all newsletters', async function () {
            sinon.stub(labs, 'isSet').withArgs('multipleNewsletters').returns(true);
            const req = {
                url: 'https://example.com?uuid=abc'
            };
            await handleUnsubscribeRequest(req);
            updateStub.calledWith({
                subscribed: false,
                newsletters: []
            }, {
                id: 'id-1'
            }).should.be.true();
        });
    });

    describe('getEmailMemberRows', function () {
        it('addEmail throws when "free" or "paid" strings are used as a recipient_filter', async function () {
            const emailModel = {
                get: sinon.stub().returns('paid'),
                related: sinon.stub().returns({
                    fetch: sinon.stub().returns({
                        id: 'test'
                    })
                })
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
                get: sinon.stub().returns('none'),
                related: sinon.stub().returns({
                    fetch: sinon.stub().returns({
                        id: 'test'
                    })
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
