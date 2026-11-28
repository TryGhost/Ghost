import { TableImporter } from './table-importer';
import { faker } from '@faker-js/faker';
import { slugify } from '@tryghost/string';
import { blogStartDate } from '../utils/blog-info';
import type { Knex } from 'knex';

type Benefit = {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
};

class BenefitsImporter extends TableImporter<Benefit> {
  static table = 'benefits';
  static dependencies: string[] = [];
  defaultQuantity = 5;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(BenefitsImporter.table, knex, transaction);
  }

  generate(): Benefit {
    const name = faker.company.catchPhrase();
    const sixMonthsLater = new Date(blogStartDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    return {
      id: this.fastFakeObjectId(),
      name: name,
      slug: `${slugify(name)}-${faker.string.numeric(3)}`,
      created_at: faker.date.between({ from: blogStartDate, to: sixMonthsLater }),
    };
  }
}

module.exports = BenefitsImporter;
