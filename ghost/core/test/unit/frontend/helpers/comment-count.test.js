const sinon = require('sinon');
const configUtils = require('../../../utils/config-utils');
const {mockManager} = require('../../../utils/e2e-framework');

const proxy = require('../../../../core/frontend/services/proxy');
const internalKeys = require('../../../../core/server/services/internal-keys').default;
const {html} = require('common-tags');
const {settingsCache} = proxy;

const {registerHelper, shouldCompileToExpected} = require('./utils/handlebars');

describe('{{comment_count}} helper', function () {
    beforeAll(function () {
        registerHelper('comment_count');
    });

    beforeEach(function () {
        internalKeys.clear();
        internalKeys.set('ghost-internal-frontend', Promise.resolve({id: 'k', secret: 'xyz'}));
        mockManager.mockMail();
        sinon.stub(settingsCache, 'get');
    });

    afterEach(async function () {
        internalKeys.clear();
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
