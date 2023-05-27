const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');
const {mockManager} = require('../../../utils/e2e-framework');

const proxy = require('../../../../core/frontend/services/proxy');
const {html} = require('common-tags');
const {settingsCache} = proxy;

const {registerHelper, shouldCompileToExpected} = require('./utils/handlebars');

describe('{{comment_count}} helper', function () {
    let keyStub;

    before(function () {
        keyStub = sinon.stub().resolves('xyz');
        const dataService = {
            getFrontendKey: keyStub
        };
        proxy.init({dataService});
        registerHelper('comment_count');
    });

    beforeEach(function () {
        mockManager.mockMail();
        sinon.stub(settingsCache, 'get');
    });

    afterEach(async function () {
        mockManager.restore();
        sinon.restore();
        await configUtils.restore();
    });

    it('returns a script with the post id when autowrap is disabled', async function () {
        const templateString = `{{comment_count empty="No comments" singular="comment" plural="comments" autowrap="false"}}`;

        shouldCompileToExpected(templateString, {
            id: 'post-id'
        }, html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty="No comments"
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
                data-ghost-comment-count-tag="script"
                data-ghost-comment-count-class-name=""
                data-ghost-comment-count-autowrap="false"
            >
            </script>
        `);
    });

    it('applies all the hash params as data attributes', function () {
        const templateString = `{{comment_count empty="No comments" singular="comment" plural="comments" autowrap="div" class="custom"}}`;

        shouldCompileToExpected(templateString, {
            id: 'post-id'
        }, html`
            <script
                data-ghost-comment-count="post-id"
                data-ghost-comment-count-empty="No comments"
                data-ghost-comment-count-singular="comment"
                data-ghost-comment-count-plural="comments"
                data-ghost-comment-count-tag="div"
                data-ghost-comment-count-class-name="custom"
                data-ghost-comment-count-autowrap="true"
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
                data-ghost-comment-count-tag="span"
                data-ghost-comment-count-class-name=""
                data-ghost-comment-count-autowrap="true"
            >
            </script>
        `);
    });
});
