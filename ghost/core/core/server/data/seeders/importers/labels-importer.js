const { TableImporter } = require('./table-importer');
const { faker } = require('@faker-js/faker');
const { slugify } = require('@tryghost/string');
const { blogStartDate } = require('../utils/blog-info');
const { toDatabaseDate } = require('../../../lib/db-date');

class LabelsImporter extends TableImporter {
  static table = 'labels';
  static dependencies = [];
  defaultQuantity = 10;

  constructor(knex, transaction) {
    super(LabelsImporter.table, knex, transaction);
    this.generatedNames = new Set();
  }

  generateName() {
    let name;
    do {
      name = `${faker.color.human()} ${faker.person.jobType()}`;
      name = `${name[0].toUpperCase()}${name.slice(1)}`;
    } while (this.generatedNames.has(name));
    this.generatedNames.add(name);
    return name;
  }

  generate() {
    const name = this.generateName();
    return {
      id: this.fastFakeObjectId(),
      name: name,
      slug: `${slugify(name)}`,
      created_at: toDatabaseDate(blogStartDate),
      updated_at: toDatabaseDate(blogStartDate),
    };
  }
}

module.exports = LabelsImporter;
