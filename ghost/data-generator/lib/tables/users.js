const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const security = require('@tryghost/security');

class UsersImporter extends TableImporter {
    constructor(knex) {
        super('users', knex);
    }

    generate() {
        const name = faker.name.fullName();
        return {
            id: faker.database.mongodbObjectId(),
            name: faker.name.fullName(),
            slug: slugify(name),
            password: security.password.hash(faker.color.human()),
            email: faker.internet.email(name),
            profile_image: faker.internet.avatar(),
            created_at: faker.date.between(new Date(2016, 0), new Date()),
            created_by: 'unused'
        };
    }
}

module.exports = UsersImporter;
