const assert = require('assert');
const ObjectID = require('bson-objectid');
const Mention = require('../lib/Mention');
const MentionsAPI = require('../lib/MentionsAPI');
const InMemoryMentionRepository = require('../lib/InMemoryMentionRepository');

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
            favicon: new URL('https://ghost.org/favicon.ico')
        };
    }
};

describe('MentionsAPI', function () {
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
});
