const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');
const {mockManager} = require('../../../utils/e2e-framework');

const comments = require('../../../../core/frontend/helpers/comments');
const proxy = require('../../../../core/frontend/services/proxy');
const {settingsCache} = proxy;

describe('{{comments}} helper', function () {
    let keyStub;

    before(function () {
        keyStub = sinon.stub().resolves('xyz');
        const dataService = {
            getFrontendKey: keyStub
        };
        proxy.init({dataService});
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockLabsEnabled('comments');
        sinon.stub(settingsCache, 'get');
        configUtils.set('comments:version', 'test.version');
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
        configUtils.restore();
    });

    it('returns undefined if not used withing post context', function (done) {
        settingsCache.get.withArgs('members_enabled').returns(true);
        settingsCache.get.withArgs('comments_enabled').returns('all');

        comments({}).then(function (rendered) {
            should.not.exist(rendered);
            done();
        }).catch(done);
    });

    it('returns a script tag', async function () {
        settingsCache.get.withArgs('members_enabled').returns(true);
        settingsCache.get.withArgs('comments_enabled').returns('all');

        const rendered = await comments.call({
            comment_id: 'post_test',
            id: 'post_id_123',
            access: true
        }, {
            hash: {},
            data: {
                site: {}
            }
        });
        should.exist(rendered);
        rendered.string.should.containEql('<script defer src="https://cdn.jsdelivr.net/npm/@tryghost/comments-ui');
        rendered.string.should.containEql('data-ghost-comments="http://127.0.0.1:2369/" data-api="http://127.0.0.1:2369/ghost/api/content/" data-admin="http://127.0.0.1:2369/ghost/" data-key="xyz" data-styles="https://cdn.jsdelivr.net/npm/@tryghost/comments-ui@~test.version/umd/main.css" data-post-id="post_id_123" data-sentry-dsn="" data-color-scheme="auto" data-avatar-saturation="50" data-accent-color="" data-app-version="test.version" data-comments-enabled="all"');
    });

    it('returns a script tag for paid only commenting', async function () {
        settingsCache.get.withArgs('members_enabled').returns(true);
        settingsCache.get.withArgs('comments_enabled').returns('paid');

        const rendered = await comments.call({
            comment_id: 'post_test',
            id: 'post_id_123',
            access: true
        }, {
            hash: {},
            data: {
                site: {}
            }
        });
        should.exist(rendered);
        rendered.string.should.containEql('<script defer src="https://cdn.jsdelivr.net/npm/@tryghost/comments-ui');
        rendered.string.should.containEql('data-ghost-comments="http://127.0.0.1:2369/" data-api="http://127.0.0.1:2369/ghost/api/content/" data-admin="http://127.0.0.1:2369/ghost/" data-key="xyz" data-styles="https://cdn.jsdelivr.net/npm/@tryghost/comments-ui@~test.version/umd/main.css" data-post-id="post_id_123" data-sentry-dsn="" data-color-scheme="auto" data-avatar-saturation="50" data-accent-color="" data-app-version="test.version" data-comments-enabled="paid"');
    });

    it('returns undefined when comments are disabled', async function () {
        settingsCache.get.withArgs('members_enabled').returns(true);
        settingsCache.get.withArgs('comments_enabled').returns('off');

        const rendered = await comments.call({
            comment_id: 'post_test',
            id: 'post_id_123',
            access: true
        }, {
            hash: {},
            data: {
                site: {}
            }
        });
        should.not.exist(rendered);
    });

    it('returns undefined when no access to post', async function () {
        settingsCache.get.withArgs('members_enabled').returns(true);
        settingsCache.get.withArgs('comments_enabled').returns('all');

        const rendered = await comments.call({
            comment_id: 'post_test',
            id: 'post_id_123',
            access: false
        }, {
            hash: {},
            data: {
                site: {}
            }
        });
        should.not.exist(rendered);
    });
});
