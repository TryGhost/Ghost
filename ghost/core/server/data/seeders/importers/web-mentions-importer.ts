import { TableImporter } from './table-importer';
import { faker } from '@faker-js/faker';
import { toDatabaseDate } from '../../../lib/db-types/date';
import type { Knex } from 'knex';

type WebMention = {
  id: string;
  source: string;
  source_title: string;
  source_site_title: string;
  source_excerpt: string;
  source_author: string;
  source_featured_image: string;
  source_favicon: string;
  target: string;
  resource_id: null;
  resource_type: null;
  created_at: string;
  payload: string;
  deleted: number;
  verified: number;
};

class WebMentionsImporter extends TableImporter<WebMention> {
  static table = 'mentions';
  static dependencies: string[] = [];
  defaultQuantity = 23;

  declare baseUrl: string;

  constructor(knex: Knex, transaction: Knex.Transaction, { baseUrl }: { baseUrl: string }) {
    super(WebMentionsImporter.table, knex, transaction);

    this.baseUrl = baseUrl;
  }

  generate(): WebMention {
    const id = this.fastFakeObjectId();

    const author = `${faker.person.fullName()}`;

    // Generating only incoming recommendations for now, since we don't use webmentions for other things atm
    return {
      id,
      source: `${faker.internet.url()}/.well-known/recommendations.json`,
      source_title: faker.lorem.sentence(5),
      source_site_title: `${author}'s ${faker.word.noun()}`,
      source_excerpt: faker.lorem.paragraph(),
      source_author: author,
      source_featured_image: `https://api.dicebear.com/5.x/shapes/png?size=256&seed=${id}`,
      source_favicon: `https://api.dicebear.com/5.x/bottts/png?size=32&seed=${id}`,
      target: `${this.baseUrl}`,
      resource_id: null,
      resource_type: null,
      created_at: toDatabaseDate(faker.date.past()),
      payload: JSON.stringify({}),
      deleted: 0,
      verified: 1,
    };
  }
}

module.exports = WebMentionsImporter;
