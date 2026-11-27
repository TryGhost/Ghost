import { faker } from '@faker-js/faker';
import { slugify } from '@tryghost/string';
import { TableImporter } from './table-importer';
import { toDatabaseDate } from '../../../lib/db-types/date';
import type { Knex } from 'knex';

type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
};

class TagsImporter extends TableImporter<Tag> {
  static table = 'tags';
  static dependencies = ['users'];
  defaultQuantity = faker.number.int({
    min: 16,
    max: 24,
  });

  declare users: unknown[];

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(TagsImporter.table, knex, transaction);
  }

  async import(quantity = this.defaultQuantity): Promise<void> {
    this.users = await this.transaction.select('id').from('users');
    await super.import(quantity);
  }

  generate(): Tag {
    let name = `${faker.color.human()} ${faker.person.jobType()} ${faker.string.numeric(10)}`;
    name = `${name[0].toUpperCase()}${name.slice(1)}`;
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return {
      id: this.fastFakeObjectId(),
      name: name,
      slug: slugify(name),
      description: faker.lorem.sentence(),
      created_at: toDatabaseDate(faker.date.between({ from: threeYearsAgo, to: twoYearsAgo })),
    };
  }
}

module.exports = TagsImporter;
