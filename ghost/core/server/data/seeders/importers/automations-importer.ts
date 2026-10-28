import { faker } from '@faker-js/faker';
import { slugify } from '@tryghost/string';
import type { Knex } from 'knex';
import { TableImporter } from './table-importer';
import { blogStartDate } from '../utils/blog-info';
import { toDatabaseDate } from '../../../lib/db-types/date';
import type { AutomationStatus } from '../../../services/automations/automations-repository';
import { MEMBER_WELCOME_EMAIL_SLUGS } from '../../../services/member-welcome-emails/constants';

type Automation = {
  id: string;
  status: AutomationStatus;
  name: string;
  slug: string;
  description: string;
  trigger_type: 'membership_started';
  created_at: string;
  updated_at: string;
};

const defaultAutomations = [
  {
    name: 'Free member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
    description: 'Welcome new free members after they sign up.',
  },
  {
    name: 'Paid member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
    description: 'Welcome new paid members after they start their subscription.',
  },
] as const;

export class AutomationsImporter extends TableImporter<Automation> {
  static table = 'automations';
  static dependencies: string[] = [];

  #generated = 0;

  defaultQuantity = 2;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(AutomationsImporter.table, knex, transaction);
  }

  async batchInsert(data: Automation[]): Promise<void> {
    await super.batchInsert(data);

    const rules = data.map((automation) => {
      const isFreeSignup = automation.slug === MEMBER_WELCOME_EMAIL_SLUGS.free;
      return {
        id: this.fastFakeObjectId(),
        automation_id: automation.id,
        trigger_type: isFreeSignup ? 'free_signup' : 'paid_subscription_started',
        scope: isFreeSignup ? null : 'any_paid_tier',
        product_id: null,
        created_at: automation.created_at,
      };
    });
    if (rules.length > 0) {
      await this.knex.batchInsert('automation_trigger_rules', rules).transacting(this.transaction);
    }
  }

  generate(): Automation {
    const id = this.fastFakeObjectId();
    const defaultAutomation = defaultAutomations[this.#generated];
    const randomName = `${faker.word.adjective()} ${faker.word.noun()} flow`;
    const name = defaultAutomation?.name ?? `${randomName} ${id}`;
    const slug = defaultAutomation?.slug ?? `${slugify(randomName)}-${id}`;
    const createdAt = faker.date.between({ from: blogStartDate, to: new Date() });

    this.#generated += 1;

    return {
      id,
      status: faker.helpers.arrayElement(['active', 'inactive']),
      name,
      description: defaultAutomation?.description ?? '',
      slug,
      trigger_type: 'membership_started',
      created_at: toDatabaseDate(createdAt),
      updated_at: toDatabaseDate(createdAt),
    };
  }
}
