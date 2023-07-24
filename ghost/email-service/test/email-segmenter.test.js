const EmailSegmenter = require('../lib/EmailSegmenter');
const sinon = require('sinon');

describe('Email segmenter', function () {
    describe('getMemberCount', function () {
        let membersRepository;
        let listStub;

        beforeEach(function () {
            listStub = sinon.stub().resolves({
                meta: {
                    pagination: {total: 12}
                }
            });
            membersRepository = {
                list: listStub
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('creates correct filter and count for members visibility with null segment', async function () {
            const emailSegmenter = new EmailSegmenter({
                membersRepository
            });

            const response = await emailSegmenter.getMembersCount({
                id: 'newsletter-123',
                get: (key) => {
                    if (key === 'visibility') {
                        return 'members';
                    }
                }
            }, 'all', null
            );
            listStub.calledOnce.should.be.true();
            listStub.calledWith({
                filter: 'newsletters.id:newsletter-123+email_disabled:0'
            }).should.be.true();
            response.should.eql(12);
        });

        it('throws errors for incorrect recipient filter or visibility', async function () {
            const emailSegmenter = new EmailSegmenter({
                membersRepository
            });
            try {
                await emailSegmenter.getMembersCount({
                    id: 'newsletter-123',
                    get: (key) => {
                        if (key === 'visibility') {
                            return 'members';
                        }
                    }
                }, 'none', null
                );
            } catch (e) {
                e.message.should.eql('Cannot send email to "none" recipient filter');
            }

            try {
                await emailSegmenter.getMembersCount({
                    id: 'newsletter-123',
                    get: (key) => {
                        if (key === 'visibility') {
                            return '';
                        }
                    }
                }, 'members', null
                );
            } catch (e) {
                e.message.should.eql('Unexpected visibility value "". Use one of the valid: "members", "paid".');
            }
        });

        it('creates correct filter and count for paid visibility and custom recipient filter', async function () {
            const emailSegmenter = new EmailSegmenter({
                membersRepository
            });
            let response = await emailSegmenter.getMembersCount(
                {
                    id: 'newsletter-123',
                    get: (key) => {
                        if (key === 'visibility') {
                            return 'paid';
                        }
                    }
                },
                'labels:test',
                null
            );

            listStub.calledOnce.should.be.true();
            listStub.calledWith({
                filter: 'newsletters.id:newsletter-123+email_disabled:0+(labels:test)+status:-free'
            }).should.be.true();
            response.should.eql(12);
        });

        it('creates correct filter and count for paid visibility and custom segment', async function () {
            const emailSegmenter = new EmailSegmenter({
                membersRepository
            });
            let response = await emailSegmenter.getMembersCount(
                {
                    id: 'newsletter-123',
                    get: (key) => {
                        if (key === 'visibility') {
                            return 'members';
                        }
                    }
                },
                'labels:test',
                'status:free'
            );

            listStub.calledOnce.should.be.true();
            listStub.calledWith({
                filter: 'newsletters.id:newsletter-123+email_disabled:0+(labels:test)+(status:free)'
            }).should.be.true();
            response.should.eql(12);
        });
    });
});
