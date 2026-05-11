/* eslint-disable @typescript-eslint/no-require-imports */
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type {DatabaseSync} from 'node:sqlite';
import type {Automation} from './automations-repository';
import {createFakeDatabaseAutomationsRepository} from './fake-database-automations-repository';

const domainEvents = require('@tryghost/domain-events');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const temporaryFakeAutomationsDatabase = require('./temporary-fake-database');

const messages = {
    automationNotFound: 'Automation not found.'
};

let testDatabase: DatabaseSync | null = null;

const repository = createFakeDatabaseAutomationsRepository({
    getDatabase: () => {
        if (process.env.NODE_ENV === 'testing') {
            testDatabase ??= temporaryFakeAutomationsDatabase.createTemporaryFakeAutomationsDatabase();
            return testDatabase;
        }
        return temporaryFakeAutomationsDatabase.getTemporaryFakeAutomationsDatabase();
    }
});

function serializeAutomation(automation: Automation) {
    return {
        id: automation.id,
        slug: automation.slug,
        name: automation.name,
        status: automation.status,
        created_at: automation.createdAt.toISOString(),
        updated_at: automation.updatedAt.toISOString(),
        actions: automation.actions,
        edges: automation.edges
    };
}

async function browse() {
    const page = await repository.browse();
    return page.data;
}

async function read(automationId: string) {
    const automation = await repository.getById(automationId);

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }

    return serializeAutomation(automation);
}

function requestPoll() {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
}

module.exports = {
    browse,
    read,
    requestPoll
};
