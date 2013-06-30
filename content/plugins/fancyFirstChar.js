var FancyFirstChar;

FancyFirstChar = function (ghost) {
    this.ghost = function () {
        return ghost;
    };
};

FancyFirstChar.prototype.init = function () {
    this.ghost().registerFilter('prePostsRender', function (posts) {
        var post,
            originalContent,
            newContent,
            firstCharIndex = 0;

        for (post in posts) {
            if (posts.hasOwnProperty(post)) {
                originalContent = posts[post].content_html;
                if (originalContent.substr(0, 1) === '<') {
                    firstCharIndex = originalContent.indexOf('>') + 1;
                }

                newContent = originalContent.substr(0, firstCharIndex);
                newContent += '<span class="fancyChar">';
                newContent += originalContent.substr(firstCharIndex, 1);
                newContent += '</span>';
                newContent += originalContent.substr(firstCharIndex + 1, originalContent.length - firstCharIndex - 1);

                posts[post].content_html = newContent;
            }
        }
        return posts;
    });
};

FancyFirstChar.prototype.activate = function () {};
FancyFirstChar.prototype.deactivate = function () {};

module.exports = FancyFirstChar;