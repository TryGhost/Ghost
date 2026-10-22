import { faker } from '@faker-js/faker';
// @ts-expect-error This module currently lacks type definitions.
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
  trigger_tier_scope: 'free' | 'all_paid';
  created_at: string;
  updated_at: string;
};

const defaultAutomations = [
  {
    name: 'Free member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
    description: 'Welcome new free members after they sign up.',
    trigger_tier_scope: 'free',
  },
  {
    name: 'Paid member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
    description: 'Welcome new paid members after they start their subscription.',
    trigger_tier_scope: 'all_paid',
  },
] as const;

export class AutomationsImporter extends TableImporter<Automation> {
  static table = 'automations';
  static dependencies: string[] = [];

  #generated = 0;
  #automations: Automation[] = [];

  defaultQuantity = 2;

  constructor(knex: Knex, transaction: Knex.Transaction) {
    super(AutomationsImporter.table, knex, transaction);
  }

  async finalise(): Promise<void> {
    if (this.#automations.length === 0) {
      return;
    }
    await this.knex
      .batchInsert(
        'automation_trigger_rules',
        this.#automations.map((automation) => ({
          id: this.fastFakeObjectId(),
          automation_id: automation.id,
          trigger_type: automation.trigger_type,
          from_scope: null,
          from_product_id: null,
          to_scope: automation.trigger_tier_scope,
          to_product_id: null,
        })),
        1000,
      )
      .transacting(this.transaction);
    this.#automations = [];
  }

  generate(): Automation {
    const id = this.fastFakeObjectId();
    const defaultAutomation = defaultAutomations[this.#generated];
    const randomName = `${faker.word.adjective()} ${faker.word.noun()} flow`;
    const name = defaultAutomation?.name ?? `${randomName} ${id}`;
    const slug = defaultAutomation?.slug ?? `${slugify(randomName)}-${id}`;
    const createdAt = faker.date.between({ from: blogStartDate, to: new Date() });

    this.#generated += 1;

    const automation: Automation = {
      id,
      status: faker.helpers.arrayElement(['active', 'inactive']),
      name,
      description: defaultAutomation?.description ?? '',
      slug,
      trigger_type: 'membership_started',
      trigger_tier_scope: defaultAutomation?.trigger_tier_scope ?? 'all_paid',
      created_at: toDatabaseDate(createdAt),
      updated_at: toDatabaseDate(createdAt),
    };
    this.#automations.push(automation);
    return automation;
  }
}
