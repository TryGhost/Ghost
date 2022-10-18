const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberClickEvent = ghostBookshelf.Model.extend({
    tableName: 'members_click_events',

    link() {
        return this.belongsTo('Redirect', 'redirect_id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    filterExpansions: function filterExpansions() {
        const expansions = [{
            key: 'post_id',
            replacement: 'link.post_id'
        }];

        return expansions;
    },

    filterRelations() {
        return {
            link: {
                // Mongo-knex doesn't support belongsTo relations
                tableName: 'redirects',
                tableNameAs: 'link',
                type: 'manyToMany',
                joinTable: 'members_click_events',
                joinFrom: 'id',
                joinTo: 'redirect_id'
            }
        };
    }

}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberClickEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberClickEvent'});
    }
});

module.exports = {
    MemberClickEvent: ghostBookshelf.model('MemberClickEvent', MemberClickEvent)
};
