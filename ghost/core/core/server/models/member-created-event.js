const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const MemberCreatedEvent = ghostBookshelf.Model.extend({
    tableName: 'members_created_events',

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    attribution() {
        // This syntax is not documented in Bookshelf, so some information:
        // First parameter: name of relation
        // Then an array with the type (which contains the so called morphValue) and id used do determine the relation
        // After that, normally you would put a list of all the models that you want to join on: Post, Tag, User
        // By default, the type stored in the _type column (= morphValue) should be the same as the other models model name.
        // However, Bookshelf also supports using custom morphValues. Then you need to pass an array (first value of array = model name, 2nd = morphValue)
        // This also allows us morph on the same model for different types.
        return this.morphTo('attribution', ['attribution_type', 'attribution_id'], ['Post', 'post'], ['Post', 'page'], ['Tag', 'tag'], ['User', 'author']);
    },

    postAttribution() {
        return this.belongsTo('Post', 'attribution_id', 'id');   
    },

    userAttribution() {
        return this.belongsTo('User', 'attribution_id', 'id');   
    },

    tagAttribution() {
        return this.belongsTo('Tag', 'attribution_id', 'id');   
    }
}, {
    async edit() {
        throw new errors.IncorrectUsageError({message: 'Cannot edit MemberCreatedEvent'});
    },

    async destroy() {
        throw new errors.IncorrectUsageError({message: 'Cannot destroy MemberCreatedEvent'});
    }
});

module.exports = {
    MemberCreatedEvent: ghostBookshelf.model('MemberCreatedEvent', MemberCreatedEvent)
};
