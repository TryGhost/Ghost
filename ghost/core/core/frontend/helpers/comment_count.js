const {SafeString} = require('../services/handlebars');
const {html} = require('common-tags');

module.exports = function commentCount(options) {
    const empty = options.hash.empty === undefined ? '' : options.hash.empty;
    const singular = options.hash.singular === undefined ? 'comment' : options.hash.singular;
    const plural = options.hash.plural === undefined ? 'comments' : options.hash.plural;
    const autowrap = options.hash.autowrap !== 'false';
    const tag = autowrap ? options.hash.autowrap || 'span' : 'script';
    const className = options.hash.class;
    return new SafeString(html`
        <script
            data-ghost-comment-count="${this.id}"
            data-ghost-comment-count-empty="${empty}"
            data-ghost-comment-count-singular="${singular}"
            data-ghost-comment-count-plural="${plural}"
            data-ghost-comment-count-tag="${tag}"
            data-ghost-comment-count-class-name="${className}"
            data-ghost-comment-count-autowrap="${autowrap ? 'true' : 'false'}"
        >
        </script>
    `);
};
