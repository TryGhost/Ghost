import { TableImporter } from './table-importer';
import { faker } from '@faker-js/faker';
import type { Knex } from 'knex';

type Recommendation = {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  featured_image: string;
  favicon: string;
  description: string;
  one_click_subscribe: boolean;
  created_at: Date;
  updated_at: Date;
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

class RecommendationsImporter extends TableImporter<Recommendation> {
  static table = 'recommendations';
  static dependencies: string[] = [];
  defaultQuantity = 0;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(RecommendationsImporter.table, knex, transaction);
  }

  generate(): Recommendation {
    const id = this.fastFakeObjectId();
    return {
      id,
      url: faker.internet.url(),
      title: capitalize(`${faker.word.adjective()} ${faker.word.noun()}`),
      excerpt: faker.lorem.sentence(),
      featured_image: `https://api.dicebear.com/5.x/shapes/png?size=256&seed=${id}`,
      favicon: `https://api.dicebear.com/5.x/shapes/png?size=32&seed=${id}`,
      description: faker.lorem.sentence(),
      one_click_subscribe: faker.datatype.boolean(),
      created_at: faker.date.past(),
      updated_at: faker.date.past(),
    };
  }
}

module.exports = RecommendationsImporter;
