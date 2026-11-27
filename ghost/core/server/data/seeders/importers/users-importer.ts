import { TableImporter } from './table-importer';
import { faker } from '@faker-js/faker';
import { slugify } from '@tryghost/string';
import security from '@tryghost/security';
import { toDatabaseDate } from '../../../lib/db-types/date';
import type { Knex } from 'knex';

type User = {
  id: string;
  name: string;
  slug: string;
  password: string;
  email: string;
  profile_image: string;
  created_at: string;
};

class UsersImporter extends TableImporter<User> {
  static table = 'users';
  static dependencies: string[] = [];
  defaultQuantity = 8;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(UsersImporter.table, knex, transaction);
  }

  async generate(): Promise<User> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    return {
      id: this.fastFakeObjectId(),
      name: name,
      slug: slugify(name),
      password: await security.password.hash(faker.color.human()),
      email: faker.internet.email({ firstName, lastName }),
      profile_image: faker.image.avatar(),
      created_at: toDatabaseDate(faker.date.between({ from: new Date(2016, 0), to: new Date() })),
    };
  }
}

module.exports = UsersImporter;
