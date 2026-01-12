const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');

class BenefitsImporter extends TableImporter {
    static table = 'benefits';
    static dependencies = [];
    defaultQuantity = 5;

    constructor(knex, transaction) {
        super(BenefitsImporter.table, knex, transaction);
    }

    generate() {
        const name = faker.company.catchPhrase();
        const sixMonthsLater = new Date(blogStartDate);
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        return {
            id: this.fastFakeObjectId(),
            name: name,
            slug: `${slugify(name)}-${faker.random.numeric(3)}`,
            created_at: faker.date.between(blogStartDate, sixMonthsLater)
        };
    }
}

module.exports = BenefitsImporter;
