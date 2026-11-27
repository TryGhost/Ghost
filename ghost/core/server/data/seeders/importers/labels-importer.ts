import { TableImporter } from './table-importer';
import { faker } from '@faker-js/faker';
import { slugify } from '@tryghost/string';
import { blogStartDate } from '../utils/blog-info';
import { toDatabaseDate } from '../../../lib/db-types/date';
import type { Knex } from 'knex';

type Label = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

class LabelsImporter extends TableImporter<Label> {
  static table = 'labels';
  static dependencies: string[] = [];
  defaultQuantity = 10;

  declare generatedNames: Set<string>;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(LabelsImporter.table, knex, transaction);
    this.generatedNames = new Set();
  }

  generateName(): string {
    let name: string;
    do {
      name = `${faker.color.human()} ${faker.person.jobType()}`;
      name = `${name[0].toUpperCase()}${name.slice(1)}`;
    } while (this.generatedNames.has(name));
    this.generatedNames.add(name);
    return name;
  }

  generate(): Label {
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
