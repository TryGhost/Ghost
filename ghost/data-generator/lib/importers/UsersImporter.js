const TableImporter = require('./TableImporter');
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
        const name = `${faker.name.firstName()} ${faker.name.lastName()}`;
        return {
            id: this.fastFakeObjectId(),
            name: name,
            slug: slugify(name),
            password: await security.password.hash(faker.color.human()),
            email: faker.internet.email(name),
            profile_image: faker.internet.avatar(),
            created_at: dateToDatabaseString(faker.date.between(new Date(2016, 0), new Date())),
            created_by: 'unused'
        };
    }
}

module.exports = UsersImporter;
