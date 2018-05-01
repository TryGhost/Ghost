const ghostBookshelf = require('./base');

let Permission,
    Permissions;

Permission = ghostBookshelf.Model.extend({

    tableName: 'permissions',

    relationships: ['roles'],
    relationshipBelongsTo: {
        roles: 'roles'
    },

    /**
     * The base model keeps only the columns, which are defined in the schema.
     * We have to add the relations on top, otherwise bookshelf-relations
     * has no access to the nested relations, which should be updated.
     */
    permittedAttributes: function permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    },

    roles: function roles() {
        return this.belongsToMany('Role', 'permissions_roles', 'permission_id', 'role_id');
    },

    users: function users() {
        return this.belongsToMany('User');
    },

    apps: function apps() {
        return this.belongsToMany('App');
    }
});

Permissions = ghostBookshelf.Collection.extend({
    model: Permission
});

module.exports = {
    Permission: ghostBookshelf.model('Permission', Permission),
    Permissions: ghostBookshelf.collection('Permissions', Permissions)
};
