import {faker} from '@faker-js/faker';
import errors from '@tryghost/errors';
import assert from 'node:assert/strict';
import type {Knex} from 'knex';
import {TableImporter} from './table-importer';
import {parseEmailAddress} from '@tryghost/parse-email-address';
import * as databaseDate from '../utils/database-date';

type Automation = {
    id: string;
    created_at: string;
};

type Member = {
    id: string;
    email: string;
    created_at: string;
};

type AutomationRun = {
    id: string;
    created_at: string;
    updated_at: string;
    automation_id: string;
    member_id: string;
    member_email: string;
};

const assertExampleEmailDomain = (email: string) => {
    const {domain} = parseEmailAddress(email) ?? {};
    assert(domain, 'Refusing to seed an automation run for a member with no email');
    assert(
        domain === 'example.com' ||
        domain === 'example.net' ||
        domain === 'example.org' ||
        domain === 'example.edu' ||
        domain.endsWith('.example'),
        `Refusing to seed an automation run for non-example email: ${email}`
    );
};

export class AutomationRunsImporter extends TableImporter<AutomationRun, Automation> {
    static table = 'automation_runs';
    static dependencies = ['automations', 'members'];

    #automation?: Automation;
    #members: Member[] = [];

    defaultQuantity = 20;

    constructor(knex: Knex, transaction: Knex.Transaction) {
        super(AutomationRunsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity): Promise<void> {
        const automations = await this.transaction.select('id', 'created_at').from<Automation>('automations');
        this.#members = await this.transaction.select('id', 'email', 'created_at').from<Member>('members');

        if (automations.length === 0 || this.#members.length === 0) {
            return;
        }

        await this.importForEach(automations, quantity / automations.length);
    }

    setReferencedModel(automation: Automation): void {
        this.#automation = automation;
    }

    generate(): AutomationRun {
        if (!this.#automation) {
            throw new errors.IncorrectUsageError({message: 'Cannot generate automation run without an automation'});
        }

        const member = faker.helpers.arrayElement(this.#members);
        const automationCreatedAt = databaseDate.parse(this.#automation.created_at);
        const memberCreatedAt = databaseDate.parse(member.created_at);
        const createdAt = faker.date.between({
            from: new Date(Math.max(automationCreatedAt.valueOf(), memberCreatedAt.valueOf())),
            to: new Date()
        });

        assertExampleEmailDomain(member.email);

        return {
            id: this.fastFakeObjectId(),
            created_at: databaseDate.dateToDatabaseString(createdAt),
            updated_at: databaseDate.dateToDatabaseString(createdAt),
            automation_id: this.#automation.id,
            member_id: member.id,
            member_email: member.email
        };
    }
}
