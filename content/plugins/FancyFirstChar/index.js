var util = require('util'),
    _ = require('underscore'),
    fancifyPlugin,
    whiteSpace = [
        '',
        ' ',
        '\t',
        '\n',
        '\r'
    ];

fancifyPlugin = {

    // Fancify a single post body
    fancify: function (originalContent) {
        var newContent,
            firstCharIndex = 0,
            firstChar,
            getIndexOfNextCharacter = function (beginFrom) {
                var currIndex = beginFrom,
                    nextChar;
                    
                nextChar = originalContent.substr(currIndex, 1);
                while (_.contains(whiteSpace, nextChar) && currIndex !== originalContent.length) {
                    currIndex += 1;
                    nextChar = originalContent.substr(currIndex, 1);    
                }

                return currIndex;
            },
            getAfterNextClosingTag = function (beginFrom) {
                return originalContent.indexOf('>', beginFrom) + 1;
            };
        
        // Skip any leading white space until we get a character
        firstCharIndex = getIndexOfNextCharacter(firstCharIndex);

        firstChar = originalContent.substr(firstCharIndex, 1);
        while (firstChar === '<') {
            // Get after the close of the tag
            firstCharIndex = getAfterNextClosingTag(firstCharIndex);

            // Skip any white space until we get a character
            firstCharIndex = getIndexOfNextCharacter(firstCharIndex);

            // Grab the character
            firstChar = originalContent.substr(firstCharIndex, 1);
        }

        // Do nothing if we found no characters
        if (firstCharIndex === originalContent.length) {
            return originalContent;
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