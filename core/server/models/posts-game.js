const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const PostsGame = ghostBookshelf.Model.extend({
    tableName: 'posts_game',

    defaults: function defaults() {
        return {

        };
    },

    formatOnWrite(attrs) {
        ['game_url', 'video_url'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.toTransformReady(attrs[attr]);
            }
        });

        return attrs;
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        ['game_url', 'video_url'].forEach((attr) => {
            if (attrs[attr]) {
                attrs[attr] = urlUtils.transformReadyToAbsolute(attrs[attr]);
            }
        });

        return attrs;
    }
}, {
    post() {
        return this.belongsTo('Post');
    }
});

module.exports = {
    PostsGame: ghostBookshelf.model('PostsGame', PostsGame)
};
