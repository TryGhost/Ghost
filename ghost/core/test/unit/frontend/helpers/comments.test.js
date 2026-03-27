const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const configUtils = require('../../../utils/config-utils');
const {mockManager} = require('../../../utils/e2e-framework');

const comments = require('../../../../core/frontend/helpers/comments');
const proxy = require('../../../../core/frontend/services/proxy');
const {settingsCache} = proxy;

describe('{{comments}} helper', function () {
    let keyStub;
    let settingsCacheGetStub;

    before(function () {
        keyStub = sinon.stub().resolves('xyz');
        const dataService = {
            getFrontendKey: keyStub
        };
        proxy.init({dataService});
    });

    beforeEach(function () {
        mockManager.mockMail();
        settingsCacheGetStub = sinon.stub(settingsCache, 'get');
        configUtils.set('comments:version', 'test.version');
    });

    afterEach(async function () {
        mockManager.restore();
        sinon.restore();
        await configUtils.restore();
    });

    it('returns undefined if not used withing post context', function (done) {
        settingsCacheGetStub.withArgs('members_enabled').returns(true);
        settingsCacheGetStub.withArgs('comments_enabled').returns('all');

        comments({}).then(function (rendered) {
            assert.equal(rendered, undefined);
            done();
        }).catch(done);
    });

    it('returns a script tag', async function () {
        settingsCacheGetStub.withArgs('members_enabled').returns(true);
        settingsCacheGetStub.withArgs('comments_enabled').returns('all');

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
        assertExists(rendered);
        assert(rendered.string.includes('<script defer src="https://cdn.jsdelivr.net/ghost/comments-ui'));
        assert(rendered.string.includes(`data-ghost-comments="${configUtils.config.get('url')}/"`));
        assert(rendered.string.includes(`data-api="${configUtils.config.get('url')}/ghost/api/content/"`));
        assert(rendered.string.includes(`data-admin="${configUtils.config.get('url')}/ghost/"`));
        assert(rendered.string.includes('data-key="xyz"'));
        assert(rendered.string.includes('data-title="null"'));
        assert(rendered.string.includes('data-count="true"'));
        assert(rendered.string.includes('data-post-id="post_id_123"'));
        assert(rendered.string.includes('data-color-scheme="auto"'));
        assert(rendered.string.includes('data-avatar-saturation="60"'));
        assert(rendered.string.includes('data-accent-color=""'));
        assert(rendered.string.includes('data-comments-enabled="all"'));
    });

    it('returns a script tag for paid only commenting', async function () {
        settingsCacheGetStub.withArgs('members_enabled').returns(true);
        settingsCacheGetStub.withArgs('comments_enabled').returns('paid');

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
        assertExists(rendered);
        assert(rendered.string.includes('<script defer src="https://cdn.jsdelivr.net/ghost/comments-ui'));
        assert(rendered.string.includes(`data-ghost-comments="${configUtils.config.get('url')}/"`));
        assert(rendered.string.includes(`data-api="${configUtils.config.get('url')}/ghost/api/content/"`));
        assert(rendered.string.includes(`data-admin="${configUtils.config.get('url')}/ghost/"`));
        assert(rendered.string.includes('data-key="xyz"'));
        assert(rendered.string.includes('data-title="null"'));
        assert(rendered.string.includes('data-count="true"'));
        assert(rendered.string.includes('data-post-id="post_id_123"'));
        assert(rendered.string.includes('data-color-scheme="auto"'));
        assert(rendered.string.includes('data-avatar-saturation="60"'));
        assert(rendered.string.includes('data-accent-color=""'));
        assert(rendered.string.includes('data-comments-enabled="paid"'));
    });

    it('returns undefined when comments are disabled', async function () {
        settingsCacheGetStub.withArgs('members_enabled').returns(true);
        settingsCacheGetStub.withArgs('comments_enabled').returns('off');

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
        assert.equal(rendered, undefined);
    });

    it('returns undefined when no access to post', async function () {
        settingsCacheGetStub.withArgs('members_enabled').returns(true);
        settingsCacheGetStub.withArgs('comments_enabled').returns('all');

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
        assert.equal(rendered, undefined);
    });
});
