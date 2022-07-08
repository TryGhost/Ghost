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
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
        configUtils.restore();
    });

    it('returns undefined if not used withing post context', function (done) {
        settingsCache.get.withArgs('members_enabled').returns(true);

        comments({}).then(function (rendered) {
            should.not.exist(rendered);
            done();
        }).catch(done);
    });

    it('returns a script tag', async function () {
        settingsCache.get.withArgs('members_enabled').returns(true);

        const rendered = await comments.call({
            comment_id: 'post_test',
            id: 'post_id_123'
        }, {
            hash: {},
            data: {
                site: {}
            }
        });
        should.exist(rendered);
        rendered.string.should.containEql('<script defer src="https://unpkg.com/@tryghost/comments-ui');
        rendered.string.should.containEql('data-ghost-comments="http://127.0.0.1:2369/" data-api="http://127.0.0.1:2369/ghost/api/content/" data-admin="http://127.0.0.1:2369/ghost/" data-key="xyz" data-post-id="post_id_123" data-sentry-dsn="" data-color-scheme="auto" data-avatar-saturation="50" data-accent-color=""');
    });
});
