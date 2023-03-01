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
        const actualRole = this.roles.find(role => role.name === userRole);
        if (!actualRole) {
            // No roles defined in database, don't bother creating user role
            return;
        }
        return {
            id: faker.database.mongodbObjectId(),
            role_id: actualRole.id,
            user_id: this.model.id
        };
    }
}

module.exports = RolesUsersImporter;
