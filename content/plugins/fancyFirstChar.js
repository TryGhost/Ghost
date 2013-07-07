var _ = require('underscore');

var fancyFirstChar;

function fancify(originalContent) {
    var newContent,
        firstCharIndex = 0;

    if (originalContent.substr(0, 1) === '<') {
        firstCharIndex = originalContent.indexOf('>') + 1;
    }

    newContent = originalContent.substr(0, firstCharIndex);
    newContent += '<span class="fancyChar">';
    newContent += originalContent.substr(firstCharIndex, 1);
    newContent += '</span>';
    newContent += originalContent.substr(firstCharIndex + 1, originalContent.length - firstCharIndex - 1);

    return newContent;
}


fancyFirstChar = {
    init: function (ghost) {
        ghost.registerFilter('prePostsRender', function (posts) {
            if (_.isArray(posts)) {
                _.each(posts, function (post) {
                    post.content_html = fancify(post.content_html);
                });
            } else if (posts.hasOwnProperty('content_html')) {
                posts.content_html = fancify(posts.content_html);
            }

            return posts;
        });
    },
    activate: function () {},
    deactivate: function () {}
};

module.exports = fancyFirstChar;