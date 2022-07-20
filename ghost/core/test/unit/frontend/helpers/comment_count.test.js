const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');
const {mockManager} = require('../../../utils/e2e-framework');

const commentCount = require('../../../../core/frontend/helpers/comment_count');
const proxy = require('../../../../core/frontend/services/proxy');
const {settingsCache} = proxy;

describe('{{comment_count}} helper', function () {
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

    it('returns a span with the post id', async function () {
        const rendered = await commentCount.call({
            id: 'post_id_123'
        }, {
            fn: sinon.stub().returns('')
        });
        should.exist(rendered);
        rendered.string.should.containEql('<span data-ghost-comment-count="post_id_123"');
    });
});
