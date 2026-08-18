import {faker} from '@faker-js/faker';
import errors from '@tryghost/errors';
import type {Knex} from 'knex';
import {TableImporter} from './table-importer';
// @ts-expect-error This module currently lacks type definitions.
import dateToDatabaseString from '../utils/database-date';

type Automation = {
    id: string;
    created_at: string;
};

type AutomationAction = {
    id: string;
    created_at: string;
    updated_at: string;
    deleted_at: null;
    automation_id: string;
    type: 'wait' | 'send_email';
};

export class AutomationActionsImporter extends TableImporter<AutomationAction, Automation> {
    static table = 'automation_actions';
    static dependencies = ['automations'];

    #automation?: Automation;
    #actionIndex = 0;

    defaultQuantity = 8;

    constructor(knex: Knex, transaction: Knex.Transaction) {
        super(AutomationActionsImporter.table, knex, transaction);
    }

    async import(quantity = this.defaultQuantity): Promise<void> {
        const automations = await this.transaction.select('id', 'created_at').from<Automation>('automations');
        if (automations.length === 0) {
            return;
        }

        await this.importForEach(automations, quantity / automations.length);
    }

    setReferencedModel(automation: Automation): void {
        this.#automation = automation;
        this.#actionIndex = 0;
    }

    generate(): AutomationAction {
        if (!this.#automation) {
            throw new errors.IncorrectUsageError({message: 'Cannot generate automation action without an automation'});
        }

        const createdAt = faker.date.between({
            from: dateToDatabaseString.parse(this.#automation.created_at),
            to: new Date()
        });
        const type = this.#actionIndex % 2 === 0 ? 'wait' : 'send_email';
        this.#actionIndex += 1;

        return {
            id: this.fastFakeObjectId(),
            created_at: dateToDatabaseString(createdAt),
            updated_at: dateToDatabaseString(createdAt),
            deleted_at: null,
            automation_id: this.#automation.id,
            type
        };
    }
}
