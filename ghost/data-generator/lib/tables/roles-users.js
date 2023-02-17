const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class RolesUsersImporter extends TableImporter {
    static table = 'roles_users';

    constructor(knex, {roles}) {
        super(RolesUsersImporter.table, knex);
        this.roles = roles;
        this.sortOrder = 0;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        const userRoles = ['Editor', 'Contributor', 'Author'];
        const userRole = userRoles[faker.datatype.number({
            min: 0,
            max: userRoles.length - 1
        })];
        return {
            id: faker.database.mongodbObjectId(),
            role_id: this.roles.find(role => role.name === userRole).id,
            user_id: this.model.id
        };
    }
}

module.exports = RolesUsersImporter;
