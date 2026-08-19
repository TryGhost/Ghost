import {faker} from '@faker-js/faker';
// @ts-expect-error This module currently lacks type definitions.
import {slugify} from '@tryghost/string';
import type {Knex} from 'knex';
import {TableImporter} from './table-importer';
// @ts-expect-error This module currently lacks type definitions.
import {blogStartDate} from '../utils/blog-info';
import {toDatabaseDate} from '../../../lib/db-date';
import {MEMBER_WELCOME_EMAIL_SLUGS} from '../../../services/member-welcome-emails/constants';

type Automation = {
    id: string;
    status: 'active' | 'inactive';
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
};

const defaultAutomations = [{
    name: 'Free member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.free
}, {
    name: 'Paid member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.paid
}];

export class AutomationsImporter extends TableImporter<Automation> {
    static table = 'automations';
    static dependencies: string[] = [];

    #generated = 0;

    defaultQuantity = 2;

    constructor(knex: Knex, transaction: Knex.Transaction) {
        super(AutomationsImporter.table, knex, transaction);
    }

    generate(): Automation {
        const id = this.fastFakeObjectId();
        const defaultAutomation = defaultAutomations[this.#generated];
        const randomName = `${faker.word.adjective()} ${faker.word.noun()} flow`;
        const name = defaultAutomation?.name ?? `${randomName} ${id}`;
        const slug = defaultAutomation?.slug ?? `${slugify(randomName)}-${id}`;
        const createdAt = faker.date.between({from: blogStartDate, to: new Date()});

        this.#generated += 1;

        return {
            id,
            status: faker.helpers.arrayElement(['active', 'inactive']),
            name,
            slug,
            created_at: toDatabaseDate(createdAt),
            updated_at: toDatabaseDate(createdAt)
        };
    }
}
