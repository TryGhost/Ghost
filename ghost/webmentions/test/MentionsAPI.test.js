const assert = require('assert');
const Mention = require('../lib/Mention');
const MentionsAPI = require('../lib/MentionsAPI');
const InMemoryMentionRepository = require('../lib/InMemoryMentionRepository');

describe('MentionsAPI', function () {
    it('Can list paginated mentions', async function () {
        const repository = new InMemoryMentionRepository();
        const api = new MentionsAPI({repository});

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
        const api = new MentionsAPI({repository});

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
        const api = new MentionsAPI({repository});

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
        const api = new MentionsAPI({repository});

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
});
