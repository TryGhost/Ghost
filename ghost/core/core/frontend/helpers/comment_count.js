const {SafeString} = require('../services/handlebars');
const {labs} = require('../services/proxy');
const {html} = require('common-tags');

function commentCount(options) {
    return new SafeString(html`
        <script
            data-ghost-comment-count="${this.id}"
            data-ghost-comment-count-empty="${options.hash.empty}"
            data-ghost-comment-count-singular="${options.hash.singular}"
            data-ghost-comment-count-plural="${options.hash.plural}"
        >
        </script>
    `);
}

module.exports = function commentsLabsWrapper() {
    const self = this;
    const args = arguments;

    return labs.enabledHelper({
        flagKey: 'comments',
        flagName: 'Comments',
        helperName: 'comment_count'
    }, () => {
        return commentCount.apply(self, args);
    });
};
