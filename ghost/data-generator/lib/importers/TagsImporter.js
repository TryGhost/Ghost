const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const TableImporter = require('./TableImporter');
const dateToDatabaseString = require('../utils/database-date');

class TagsImporter extends TableImporter {
    static table = 'tags';
    static dependencies = ['users'];
    defaultQuantity = faker.datatype.number({
        min: 16,
        max: 24
    });

    constructor(knex, transaction) {
        super(TagsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity) {
        this.users = await this.transaction.select('id').from('users');
        await super.import(quantity);
    }

    generate() {
        let name = `${faker.color.human()} ${faker.name.jobType()}`;
        name = `${name[0].toUpperCase()}${name.slice(1)}`;
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        return {
            id: faker.database.mongodbObjectId(),
            name: name,
            slug: `${slugify(name)}-${faker.random.numeric(3)}`,
            description: faker.lorem.sentence(),
            created_at: dateToDatabaseString(faker.date.between(threeYearsAgo, twoYearsAgo)),
            created_by: this.users[faker.datatype.number(this.users.length - 1)].id
        };
    }
}

module.exports = TagsImporter;
