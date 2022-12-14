const {addTable, combineNonTransactionalMigrations} = require('../../utils');

function reverseMigration({up, down, config}) {
    return {
        config,
        up: down,
        down: up
    };
}

module.exports = reverseMigration(
    combineNonTransactionalMigrations(
        addTable('link_redirects', {
            id: {type: 'string', maxlength: 24, nullable: false, primary: true},
            from: {type: 'string', maxlength: 2000, nullable: false},
            to: {type: 'string', maxlength: 2000, nullable: false},
            post_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'posts.id', setNullDelete: true},
            created_at: {type: 'dateTime', nullable: false},
            updated_at: {type: 'dateTime', nullable: true}
        }),
        addTable('members_link_click_events', {
            id: {type: 'string', maxlength: 24, nullable: false, primary: true},
            member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
            link_id: {type: 'string', maxlength: 24, nullable: false, references: 'link_redirects.id', cascadeDelete: true},
            created_at: {type: 'dateTime', nullable: false}
        })
    )
);
