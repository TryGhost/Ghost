const {addTable} = require('../../utils');

module.exports = addTable('posts_game', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    game_url: {type: 'string', maxlength: 2000, nullable: true },
    is_game: {type: 'bool', nullable: false, defaultTo: false},
});
