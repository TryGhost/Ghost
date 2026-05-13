/* eslint-disable @typescript-eslint/no-require-imports */
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import ObjectId from 'bson-objectid';
import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {createFakeDatabaseAutomationsRepository} from './fake-database-automations-repository';
import type {
    EditAutomationData
} from './automations-repository';

const domainEvents = require('@tryghost/domain-events');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const temporaryFakeAutomationsDatabase = require('./temporary-fake-database');

const MAX_AUTOMATION_ACTIONS = 20;

const messages = {
    automationNotFound: 'Automation not found.',
    invalidAutomationPayload: 'Automation edit payload must include status, actions, and edges.',
    invalidAutomationStatus: 'Automation status must be one of: active, inactive.',
    duplicateAutomationActionIdentity: 'Automation action identifiers must be unique.',
    invalidAutomationEdgeEndpoint: 'Automation edges must reference actions in the submitted graph.',
    duplicateAutomationEdge: 'Automation edges must be unique.',
    invalidAutomationEdge: 'Automation edges cannot connect an action to itself.',
    invalidAutomationGraphShape: 'Automation graph must be a single linear path without branches or cycles.'
};

const objectIdSchema = z.string().refine(value => ObjectId.isValid(value));

const waitActionSchema = z.object({
    id: objectIdSchema,
    type: z.literal('wait'),
    data: z.object({
        wait_hours: z.number().int().positive()
    }).strict()
}).strict();

const sendEmailActionSchema = z.object({
    id: objectIdSchema,
    type: z.literal('send_email'),
    data: z.object({
        email_subject: z.string().min(1),
        email_lexical: z.string().refine((value) => {
            try {
                JSON.parse(value);
                return true;
            } catch {
                return false;
            }
        }),
        email_sender_name: z.string().nullable(),
        email_sender_email: z.string().nullable(),
        email_sender_reply_to: z.string().nullable(),
        email_design_setting_id: z.string().min(1)
    }).strict()
}).strict();

const edgeSchema = z.object({
    source_action_id: objectIdSchema,
    target_action_id: objectIdSchema
}).strict();

const editAutomationDataSchema = z.object({
    status: z.enum(['active', 'inactive']),
    actions: z.array(z.discriminatedUnion('type', [
        waitActionSchema,
        sendEmailActionSchema
    ])).min(1).max(MAX_AUTOMATION_ACTIONS),
    edges: z.array(edgeSchema)
}).strict();

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

async function edit(automationId: string, data: unknown) {
    const parsedData = validateEditData(data);

    const automation = await repository.edit(automationId, parsedData);

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }

    return automation;
}

function validateEditData(data: unknown): EditAutomationData {
    const result = editAutomationDataSchema.safeParse(data);

    if (!result.success) {
        if (result.error.issues.some(issue => issue.path[0] === 'status')) {
            throwValidationError(messages.invalidAutomationStatus, 'status');
        }

        throwValidationError(buildInvalidAutomationPayloadMessage(result.error.issues));
    }

    validateGraph(result.data.actions, result.data.edges);
    return result.data;
}

function buildInvalidAutomationPayloadMessage(issues: z.core.$ZodIssue[]) {
    if (!issues.length) {
        return messages.invalidAutomationPayload;
    }

    const issueSummaries = issues.slice(0, 3).map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : 'payload';
        return `${path}: ${issue.message}`;
    });

    return `${messages.invalidAutomationPayload} ${issueSummaries.join('; ')}.`;
}

function validateGraph(actions: EditAutomationData['actions'], edges: EditAutomationData['edges']) {
    const actionIdentities = new Set<string>();

    // Every action in the submitted graph must have a unique ObjectId so edges
    // can refer to a single, unambiguous node.
    for (const action of actions) {
        if (actionIdentities.has(action.id)) {
            throwValidationError(messages.duplicateAutomationActionIdentity, 'actions');
        }
        actionIdentities.add(action.id);
    }

    const edgeIdentities = new Set<string>();
    const outgoing = new Map<string, string>();
    const incoming = new Map<string, string>();

    // Edges are stored without ids, so source/target pairs are their identity.
    // While collecting them, also track incoming/outgoing degree so we can
    // reject branches before checking the full path shape.
    for (const edge of edges) {
        if (!actionIdentities.has(edge.source_action_id) || !actionIdentities.has(edge.target_action_id)) {
            throwValidationError(messages.invalidAutomationEdgeEndpoint, 'edges');
        }

        if (edge.source_action_id === edge.target_action_id) {
            throwValidationError(messages.invalidAutomationEdge, 'edges');
        }

        const edgeIdentity = `${edge.source_action_id}->${edge.target_action_id}`;
        if (edgeIdentities.has(edgeIdentity)) {
            throwValidationError(messages.duplicateAutomationEdge, 'edges');
        }
        edgeIdentities.add(edgeIdentity);

        if (outgoing.has(edge.source_action_id) || incoming.has(edge.target_action_id)) {
            throwValidationError(messages.invalidAutomationGraphShape, 'edges');
        }

        outgoing.set(edge.source_action_id, edge.target_action_id);
        incoming.set(edge.target_action_id, edge.source_action_id);
    }

    validateLinearGraph(actionIdentities, outgoing, incoming);
}

function validateLinearGraph(actionIdentities: Set<string>, outgoing: Map<string, string>, incoming: Map<string, string>) {
    // A single-action automation is valid only when it has no edges.
    if (actionIdentities.size === 1) {
        if (outgoing.size !== 0 || incoming.size !== 0) {
            throwValidationError(messages.invalidAutomationGraphShape, 'edges');
        }
        return;
    }

    // A linear path with N actions must have exactly N - 1 edges.
    if (outgoing.size !== actionIdentities.size - 1) {
        throwValidationError(messages.invalidAutomationGraphShape, 'edges');
    }

    const heads = [...actionIdentities].filter(identity => !incoming.has(identity));
    const tails = [...actionIdentities].filter(identity => !outgoing.has(identity));

    // A valid path has one start node with no incoming edge and one end node
    // with no outgoing edge.
    if (heads.length !== 1 || tails.length !== 1) {
        throwValidationError(messages.invalidAutomationGraphShape, 'edges');
    }

    const visited = new Set<string>();
    let cursor: string | undefined = heads[0];

    // Walk from the head through outgoing edges. Revisiting a node means a
    // cycle; visiting fewer nodes than submitted means the graph is disconnected.
    while (cursor) {
        if (visited.has(cursor)) {
            throwValidationError(messages.invalidAutomationGraphShape, 'edges');
        }

        visited.add(cursor);
        cursor = outgoing.get(cursor);
    }

    if (visited.size !== actionIdentities.size) {
        throwValidationError(messages.invalidAutomationGraphShape, 'edges');
    }
}

function throwValidationError(message: string, property?: string): never {
    throw new errors.ValidationError({
        message,
        property
    });
}

function requestPoll() {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
}

function _resetTestDatabase() {
    if (process.env.NODE_ENV?.startsWith('testing')) {
        testDatabase = null;
    }
}

module.exports = {
    _resetTestDatabase,
    browse,
    edit,
    read,
    requestPoll
};
