const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');
const {mockManager} = require('../../../utils/e2e-framework');

const commentCount = require('../../../../core/frontend/helpers/comment_count');
const proxy = require('../../../../core/frontend/services/proxy');
const {html} = require('common-tags');
const {settingsCache} = proxy;

const handlebars = require('../../../../core/frontend/services/theme-engine/engine').handlebars;

describe('{{comment_count}} helper', function () {
    let keyStub;

    before(function () {
        keyStub = sinon.stub().resolves('xyz');
        const dataService = {
            getFrontendKey: keyStub
        };
        proxy.init({dataService});
        handlebars.registerHelper('comment_count', commentCount);
    });

    function shouldCompileToExpected(templateString, hash, expected) {
        const template = handlebars.compile(templateString);
        const result = template(hash);

        result.should.eql(expected);
    }

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

    it('returns a script with the post id', async function () {
        const templateString = `{{comment_count empty="No comments" singular="comment" plural="comments"}}`;

        shouldCompileToExpected(templateString, {
            id: 'post-id'
        }, html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty="No comments"
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
            >
            </script>
        `);
    });

    it('correctly sets the defaults', async function () {
        const templateString = `{{comment_count}}`;

        shouldCompileToExpected(templateString, {
            id: 'post-id'
        }, html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty=""
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
            >
            </script>
        `);
    });
});
