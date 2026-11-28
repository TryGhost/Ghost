import { TableImporter } from './table-importer';
import { blogStartDate } from '../utils/blog-info';
import { faker } from '@faker-js/faker';
import { slugify } from '@tryghost/string';
import type { Knex } from 'knex';

type Newsletter = {
  id: string;
  uuid: string;
  name: string;
  slug: string;
  sender_reply_to: string;
  status: string;
  subscribe_on_signup: boolean;
  sort_order: number;
  created_at: Date;
};

class NewslettersImporter extends TableImporter<Newsletter> {
  static table = 'newsletters';
  static dependencies: string[] = [];

  defaultQuantity = 2;

  sortOrder = 0;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(NewslettersImporter.table, knex, transaction);
  }

  generate(): Newsletter {
    const name = `${faker.commerce.productAdjective()} ${faker.word.noun()}`;
    const sortOrder = this.sortOrder;
    this.sortOrder = this.sortOrder + 1;

    const weekAfter = new Date(blogStartDate);
    weekAfter.setDate(weekAfter.getDate() + 7);

    return {
      id: this.fastFakeObjectId(),
      uuid: faker.string.uuid(),
      name: name,
      slug: `${slugify(name)}-${faker.string.numeric(3)}`,
      sender_reply_to: 'newsletter',
      status: 'active',
      subscribe_on_signup: faker.datatype.boolean(),
      sort_order: sortOrder,
      created_at: faker.date.between({ from: blogStartDate, to: weekAfter }),
    };
  }
}

module.exports = NewslettersImporter;
