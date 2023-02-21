const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {slugify} = require('@tryghost/string');
const {blogStartDate} = require('../utils/blog-info');
const dateToDatabaseString = require('../utils/database-date');

class LabelsImporter extends TableImporter {
    static table = 'labels';

    constructor(knex) {
        super(LabelsImporter.table, knex);
        this.generatedNames = new Set();
    }

    generateName() {
        let name;
        do {
            name = `${faker.color.human()} ${faker.name.jobType()}`;
            name = `${name[0].toUpperCase()}${name.slice(1)}`;
        } while (this.generatedNames.has(name));
        this.generatedNames.add(name);
        return name;
    }

    generate() {
        const name = this.generateName();
        return {
            id: faker.database.mongodbObjectId(),
            name: name,
            slug: `${slugify(name)}`,
            created_at: dateToDatabaseString(blogStartDate),
            created_by: '1',
            updated_at: dateToDatabaseString(blogStartDate),
            updated_by: '1'
        };
    }
}

module.exports = LabelsImporter;
