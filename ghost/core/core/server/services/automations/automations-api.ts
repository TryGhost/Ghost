/* eslint-disable @typescript-eslint/no-require-imports */
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type {DatabaseSync} from 'node:sqlite';
import {createFakeDatabaseAutomationsRepository} from './fake-database-automations-repository';

const domainEvents = require('@tryghost/domain-events');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const temporaryFakeAutomationsDatabase = require('./temporary-fake-database');

const messages = {
    automationNotFound: 'Automation not found.'
};

interface EditAutomationData {
    status: string;
}

let testDatabase: DatabaseSync | null = null;

const repository = createFakeDatabaseAutomationsRepository({
    getDatabase: () => {
        if (process.env.NODE_ENV?.startsWith('testing')) {
            testDatabase ??= temporaryFakeAutomationsDatabase.createTemporaryFakeAutomationsDatabase();
            return testDatabase;
        }
        return temporaryFakeAutomationsDatabase.getTemporaryFakeAutomationsDatabase();
    }
});

async function browse() {
    return await repository.browse();
}

async function read(automationId: string) {
    const automation = await repository.getById(automationId);

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }

    return automation;
}

async function edit(automationId: string, data: EditAutomationData) {
    // TODO (NY-1229): Allow updating other fields and actions/edges.
    const automation = await repository.edit(automationId, {
        status: data.status
    });

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }

    return automation;
}

function requestPoll() {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
}

module.exports = {
    browse,
    edit,
    read,
    requestPoll
};
