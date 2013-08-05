var util = require('util'),
    _ = require('underscore'),
    fancifyPlugin;

fancifyPlugin = {

    // Fancify a single post body
    fancify: function (originalContent) {
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
    },

    // Fancify a collection of posts
    fancifyPosts: function (posts) {
        var self = this;

        if (_.isArray(posts)) {
            _.each(posts, function (post) {
                post.content = self.fancify(post.content);
            });
        } else if (posts.hasOwnProperty('content')) {
            posts.content = this.fancify(posts.content);
        }

        return posts;
    },

    install: function () {

    },

    uninstall: function () {

    },

    // Registers the prePostsRender filter to alter the content.
    activate: function (ghost) {
        ghost.registerFilter('prePostsRender', this.fancifyPosts);
    },

    // Unregister any filters.
    deactivate: function (ghost) {
        ghost.unregisterFilter("prePostsRender", this.fancifyPosts);
    }
};

// Ensure our this context in the important methods
_.bindAll(fancifyPlugin, "fancifyPosts", "fancify", "activate", "deactivate");

module.exports = fancifyPlugin;