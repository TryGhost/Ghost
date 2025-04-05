const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');

class RolesUsersImporter extends TableImporter {
    static table = 'roles_users';
    // No roles imorter, since roles are statically defined in database
    static dependencies = ['users'];

    constructor(knex, transaction) {
        super(RolesUsersImporter.table, knex, transaction);
    }

    /**
     * Ignore overriden quantity for 1:1 relationship
     */
    async import() {
        const users = await this.transaction.select('id').from('users').whereNot('id', 1);
        this.roles = await this.transaction.select('id', 'name').from('roles');

        await this.importForEach(users, 1);
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
            id: this.fastFakeObjectId(),
            role_id: actualRole.id,
            user_id: this.model.id
        };
    }
}

module.exports = RolesUsersImporter;
