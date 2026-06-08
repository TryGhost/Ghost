const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const security = require('@tryghost/security');
const dateToDatabaseString = require('../utils/database-date');

class UsersImporter extends TableImporter {
    static table = 'users';
    static dependencies = [];
    defaultQuantity = 8;

    constructor(knex, transaction) {
        super(UsersImporter.table, knex, transaction);
    }

    async generate() {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const name = `${firstName} ${lastName}`;
        return {
            id: this.fastFakeObjectId(),
            name: name,
            slug: slugify(name),
            password: await security.password.hash(faker.color.human()),
            email: faker.internet.email({firstName, lastName}),
            profile_image: faker.image.avatar(),
            created_at: dateToDatabaseString(faker.date.between({from: new Date(2016, 0), to: new Date()}))
        };
    }
}

module.exports = UsersImporter;
