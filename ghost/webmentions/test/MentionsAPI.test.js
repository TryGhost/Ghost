const assert = require('assert/strict');
const ObjectID = require('bson-objectid');
const Mention = require('../lib/Mention');
const MentionsAPI = require('../lib/MentionsAPI');
const InMemoryMentionRepository = require('../lib/InMemoryMentionRepository');
const sinon = require('sinon');
const cheerio = require('cheerio');

const mockRoutingService = {
    async pageExists() {
        return true;
    }
};
const mockResourceService = {
    async getByURL() {
        return {
            type: null,
            id: null
        };
    }
};
const mockWebmentionMetadata = {
    async fetch() {
        return {
            siteTitle: 'Clickbait News',
            title: 'This egg breakfast will make you cry',
            excerpt: 'How many times have you woken up and almost cancelled your church plans? Well this breakfast is about to change everything, a hearty, faith restoring egg dish that will get your tastebuds in a twist.',
            author: 'Dr Egg Man',
            image: new URL('https://unsplash.com/photos/QAND9huzD04'),
            favicon: new URL('https://ghost.org/favicon.ico'),
            body: `<html><body><p>Some HTML and a <a href='http://target.com/'>mentioned url</a></p></body></html>`
        };
    }
};

function addMinutes(date, minutes) {
    date.setMinutes(date.getMinutes() + minutes);

    return date;
}

describe('MentionsAPI', function () {
    beforeEach(function () {
        sinon.restore();
    });

    it('Can generate a mentions report', async function () {
        // this.retries(1);
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mention = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mention instanceof Mention);

        const now = new Date();

        const report = await api.getMentionReport(new Date(0), now);

        assert.deepEqual(report.startDate, new Date(0));
        assert.deepEqual(report.endDate, now);
    });

    it('Can list paginated mentions', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mention = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mention instanceof Mention);

        const page = await api.listMentions({
            limit: 1,
            page: 1
        });

        assert.equal(page.data[0].id, mention.id);
    });

    it('Can list all mentions', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mention = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mention instanceof Mention);

        const page = await api.listMentions({
            limit: 'all'
        });

        assert.equal(page.data[0].id, mention.id);
    });

    it('Can list filtered mentions', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mentionOne = await api.processWebmention({
            source: new URL('https://diff-source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });
        const mentionTwo = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mentionOne instanceof Mention);
        assert(mentionTwo instanceof Mention);

        const page = await api.listMentions({
            filter: 'source.host:source.com',
            limit: 'all'
        });

        assert(page.meta.pagination.total === 1);
        assert(page.data[0].id === mentionTwo.id);
    });

    it('Can list mentions in descending order', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mentionOne = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        sinon.useFakeTimers(addMinutes(new Date(), 10).getTime());

        const mentionTwo = await api.processWebmention({
            source: new URL('https://source2.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mentionOne instanceof Mention);
        assert(mentionTwo instanceof Mention);

        const page = await api.listMentions({
            limit: 'all',
            order: 'created_at desc'
        });

        assert(page.meta.pagination.total === 2);
        assert(page.data[0].id === mentionTwo.id, 'First mention should be the second one in descending order');
        assert(page.data[1].id === mentionOne.id, 'Second mention should be the first one in descending order');
    });

    it('Can list mentions in ascending order', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mentionOne = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        sinon.useFakeTimers(addMinutes(new Date(), 10).getTime());

        const mentionTwo = await api.processWebmention({
            source: new URL('https://source2.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mentionOne instanceof Mention);
        assert(mentionTwo instanceof Mention);

        const page = await api.listMentions({
            limit: 'all',
            order: 'created_at asc'
        });

        assert(page.meta.pagination.total === 2);
        assert(page.data[0].id === mentionOne.id, 'First mention should be the first one in ascending order');
        assert(page.data[1].id === mentionTwo.id, 'Second mention should be the second one in ascending order');
    });

    it('Can handle updating mentions', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        const mentionOne = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        const mentionTwo = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {
                new: 'info'
            }
        });

        assert(mentionOne.id === mentionTwo.id);

        const page = await api.listMentions({
            limit: 'all'
        });

        assert(page.meta.pagination.total === 1);
        assert(page.data[0].id === mentionOne.id);
    });

    it('Will error if the target page does not exist', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: {
                async pageExists() {
                    return false;
                }
            },
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        let errored = false;
        try {
            await api.processWebmention({
                source: new URL('https://source.com'),
                target: new URL('https://target.com'),
                payload: {}
            });
        } catch (err) {
            errored = true;
        } finally {
            assert(errored);
        }
    });

    it('Handles verify errors', async function () {
        const repository = new InMemoryMentionRepository();
        sinon.stub(cheerio, 'load').throws(new Error('Test error'));

        const api = new MentionsAPI({
            repository,
            routingService: {
                async pageExists() {
                    return true;
                }
            },
            resourceService: mockResourceService,
            webmentionMetadata: mockWebmentionMetadata
        });

        await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });
    });

    it('Will only store resource if if the resource type is post', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: {
                async getByURL() {
                    return {
                        type: 'post',
                        id: new ObjectID
                    };
                }
            },
            webmentionMetadata: mockWebmentionMetadata
        });

        const mention = await api.processWebmention({
            source: new URL('https://source.com'),
            target: new URL('https://target.com'),
            payload: {}
        });

        assert(mention instanceof Mention);

        const page = await api.listMentions({
            limit: 'all'
        });

        assert.equal(page.data[0].id, mention.id);
    });

    it('Will delete an existing mention if the target page does not exist', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: {
                pageExists: sinon.stub().onFirstCall().resolves(true).onSecondCall().resolves(false)
            },
            resourceService: {
                async getByURL() {
                    return {
                        type: 'post',
                        id: new ObjectID
                    };
                }
            },
            webmentionMetadata: mockWebmentionMetadata
        });

        checkFirstMention: {
            const mention = await api.processWebmention({
                source: new URL('https://source.com'),
                target: new URL('https://target.com'),
                payload: {}
            });

            const page = await api.listMentions({
                limit: 'all'
            });

            assert.equal(page.data[0].id, mention.id);
            break checkFirstMention;
        }

        checkMentionDeleted: {
            await api.processWebmention({
                source: new URL('https://source.com'),
                target: new URL('https://target.com'),
                payload: {}
            });

            const page = await api.listMentions({
                limit: 'all'
            });

            assert.equal(page.data.length, 0);
            break checkMentionDeleted;
        }
    });

    it('Will delete an existing mention if the source page does not exist', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: {
                async getByURL() {
                    return {
                        type: 'post',
                        id: new ObjectID
                    };
                }
            },
            webmentionMetadata: {
                fetch: sinon.stub()
                    .onFirstCall().resolves(mockWebmentionMetadata.fetch())
                    .onSecondCall().rejects()
            }
        });

        checkFirstMention: {
            const mention = await api.processWebmention({
                source: new URL('https://source.com'),
                target: new URL('https://target.com'),
                payload: {}
            });

            const page = await api.listMentions({
                limit: 'all'
            });

            assert.equal(page.data[0].id, mention.id);
            break checkFirstMention;
        }

        checkMentionDeleted: {
            await api.processWebmention({
                source: new URL('https://source.com'),
                target: new URL('https://target.com'),
                payload: {}
            });

            const page = await api.listMentions({
                limit: 'all'
            });

            assert.equal(page.data.length, 0);
            break checkMentionDeleted;
        }
    });

    it('Will throw for new mentions if the source page is not found', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({
            repository,
            routingService: mockRoutingService,
            resourceService: {
                async getByURL() {
                    return {
                        type: 'post',
                        id: new ObjectID
                    };
                }
            },
            webmentionMetadata: {
                fetch: sinon.stub().rejects(new Error(''))
            }
        });

        let error = null;
        try {
            await api.processWebmention({
                source: new URL('https://source.com'),
                target: new URL('https://target.com'),
                payload: {}
            });
        } catch (err) {
            error = err;
        } finally {
            assert(error);
        }
    });
});
