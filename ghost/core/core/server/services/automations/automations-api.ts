import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import ObjectId from 'bson-objectid';
import moment from 'moment-timezone';
import {z} from 'zod';
import {createDatabaseAutomationsRepository} from './database-automations-repository';
import {parseFakeWaitHoursMultiplier} from './fake-wait-hours-multiplier';
import type {
    AutomationsRepository,
    EditAutomationData
} from './automations-repository';

const {knex} = require('../../data/db');
const domainEvents = require('@tryghost/domain-events');
const labs = require('../../../shared/labs');
const config = require('../../../shared/config');
const lexicalLib = require('../../lib/lexical');
const settingsCache = require('../../../shared/settings-cache');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');

const MAX_AUTOMATION_ACTIONS = 20;

const messages = {
    automationNotFound: 'Automation not found.',
    automationActionNotFound: 'Automation action not found.',
    invalidAutomationPayload: 'Automation edit payload must include status, actions, and edges.',
    invalidAutomationStatus: 'Automation status must be one of: active, inactive.',
    duplicateAutomationActionIdentity: 'Automation action identifiers must be unique.',
    invalidAutomationEdgeEndpoint: 'Automation edges must reference actions in the submitted graph.',
    duplicateAutomationEdge: 'Automation edges must be unique.',
    invalidAutomationEdge: 'Automation edges cannot connect an action to itself.',
    invalidAutomationGraphShape: 'Automation graph must be a single linear path without branches or cycles.',
    emptyEmailSubjectWhenActive: 'Active automations require a subject line for every email.',
    emptyEmailBodyWhenActive: 'Active automations require a body for every email.',
    invalidEmailLexical: 'Email lexical must be a well-formed Lexical document.',
    invalidRunAnalyticsOptions: 'Invalid automation run analytics options.',
    invalidRunAnalyticsDateRange: 'Automation run analytics date ranges must contain between 1 and 90 days.'
};

const objectIdSchema = z.string().refine(value => ObjectId.isValid(value));

const waitActionSchema = z.object({
    id: objectIdSchema,
    type: z.literal('wait'),
    data: z.object({
        wait_hours: z.number().int().positive()
    })
});

const sendEmailActionSchema = z.object({
    id: objectIdSchema,
    type: z.literal('send_email'),
    data: z.object({
        email_subject: z.string(),
        email_lexical: z.string(),
        email_design_setting_id: z.string().min(1)
    })
});

const edgeSchema = z.object({
    source_action_id: objectIdSchema,
    target_action_id: objectIdSchema
});

const editAutomationDataSchema = z.object({
    status: z.enum(['active', 'inactive']),
    actions: z.array(z.discriminatedUnion('type', [
        waitActionSchema,
        sendEmailActionSchema
    ])).min(1).max(MAX_AUTOMATION_ACTIONS),
    edges: z.array(edgeSchema)
});

const repository = createDatabaseAutomationsRepository({
    knex,
    fakeWaitHoursMultiplier: parseFakeWaitHoursMultiplier(config.get('automations:fakeWaitHoursMultiplier'))
});

export async function browse() {
    return await repository.browse();
}

const runAnalyticsOptionsSchema = z.object({
    automation_id: objectIdSchema.optional(),
    include: z.enum(['series']).optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine(options => Boolean(options.date_from) === Boolean(options.date_to));

export async function browseRunAnalytics(options: unknown) {
    const result = runAnalyticsOptionsSchema.safeParse(options);
    if (!result.success) {
        throwValidationError(messages.invalidRunAnalyticsOptions);
    }

    const timezone = settingsCache.get('timezone') || 'Etc/UTC';
    const dateBuckets = result.data.include === 'series' ? buildRunAnalyticsDateBuckets({
        dateFrom: result.data.date_from,
        dateTo: result.data.date_to,
        timezone
    }) : undefined;
    const data = await repository.browseRunAnalytics({
        automationId: result.data.automation_id,
        dateBuckets
    });

    return {
        data,
        meta: {
            pagination: {
                page: 1,
                pages: 1,
                limit: 'all' as const,
                total: data.length,
                prev: null,
                next: null
            }
        }
    };
}

function buildRunAnalyticsDateBuckets({dateFrom, dateTo, timezone}: {
    dateFrom?: string;
    dateTo?: string;
    timezone: string;
}) {
    const end = dateTo
        ? moment.tz(dateTo, 'YYYY-MM-DD', true, timezone)
        : moment().tz(timezone).startOf('day');
    const start = dateFrom
        ? moment.tz(dateFrom, 'YYYY-MM-DD', true, timezone)
        : end.clone().subtract(29, 'days');

    if (!start.isValid() || !end.isValid()) {
        throwValidationError(messages.invalidRunAnalyticsOptions);
    }

    const dayCount = end.diff(start, 'days') + 1;
    if (dayCount < 1 || dayCount > 90) {
        throwValidationError(messages.invalidRunAnalyticsDateRange);
    }

    return Array.from({length: dayCount}, (_, index) => {
        const bucketStart = start.clone().add(index, 'days');
        return {
            date: bucketStart.format('YYYY-MM-DD'),
            start: bucketStart.toDate(),
            end: bucketStart.clone().add(1, 'day').toDate()
        };
    });
}

export async function read(automationId: string) {
    const automation = await repository.getById(automationId);

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }

    return automation;
}

export async function browseActionLinks(automationId: string, actionId: string) {
    const links = await repository.getAutomationActionLinks(automationId, actionId);

    if (!links) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationActionNotFound)
        });
    }

    return links;
}

export async function edit(automationId: string, data: unknown) {
    const parsedData = await validateEditData(data);

    const automation = await repository.edit(automationId, parsedData);

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }

    return automation;
}

async function validateEditData(data: unknown): Promise<EditAutomationData> {
    const result = editAutomationDataSchema.safeParse(data);

    if (!result.success) {
        if (result.error.issues.some(issue => issue.path[0] === 'status')) {
            throwValidationError(messages.invalidAutomationStatus, 'status');
        }

        throwValidationError(buildInvalidAutomationPayloadMessage(result.error.issues));
    }

    validateGraph(result.data.actions, result.data.edges);
    await validateEmailLexical(result.data.actions);
    validateActiveEmailSteps(result.data.status, result.data.actions);
    return result.data;
}

async function validateEmailLexical(actions: EditAutomationData['actions']) {
    await Promise.all(actions.map(async (action) => {
        if (action.type !== 'send_email') {
            return;
        }

        const lexical = action.data.email_lexical;

        // Empty editor documents are valid draft state and are classified by
        // active-body validation below. Invalid JSON is not skipped here.
        if (isValidEmptyLexical(lexical)) {
            return;
        }

        if (isMalformedEmptyLexical(lexical)) {
            throwValidationError(messages.invalidEmailLexical, 'actions');
        }

        if (!await lexicalLib.validate(lexical)) {
            throwValidationError(messages.invalidEmailLexical, 'actions');
        }
    }));
}

// Drafts may persist empty email steps, but an active automation must have a
// complete subject and body for every email it sends — mirroring the editor's
// publish-time validation.
function validateActiveEmailSteps(status: EditAutomationData['status'], actions: EditAutomationData['actions']) {
    if (status !== 'active') {
        return;
    }

    for (const action of actions) {
        if (action.type !== 'send_email') {
            continue;
        }

        if (!action.data.email_subject.trim()) {
            throwValidationError(messages.emptyEmailSubjectWhenActive, 'actions');
        }

        if (isEmptyLexical(action.data.email_lexical)) {
            throwValidationError(messages.emptyEmailBodyWhenActive, 'actions');
        }
    }
}

function isEmptyLexical(lexical: string): boolean {
    try {
        const parsed = JSON.parse(lexical);
        return isEmptyParsedLexical(parsed);
    } catch {
        return true;
    }
}

function isValidEmptyLexical(lexical: string): boolean {
    try {
        return isEmptyParsedLexical(JSON.parse(lexical));
    } catch {
        return false;
    }
}

function isMalformedEmptyLexical(lexical: string): boolean {
    try {
        const children = JSON.parse(lexical)?.root?.children;

        if (!Array.isArray(children) || children.length !== 1 || children[0].type !== 'paragraph') {
            return false;
        }

        return !Array.isArray(children[0].children);
    } catch {
        return false;
    }
}

function isEmptyParsedLexical(parsed: {root?: {children?: Array<{type?: string; children?: unknown}>}}): boolean {
    const children = parsed?.root?.children;

    if (!Array.isArray(children)) {
        return false;
    }

    if (children.length === 0) {
        return true;
    }

    if (children.length !== 1 || children[0].type !== 'paragraph') {
        return false;
    }

    return Array.isArray(children[0].children) && children[0].children.length === 0;
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

export function requestPoll() {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
}

type TriggerOptions = Parameters<AutomationsRepository['trigger']>[0] & {
    event: 'member_sign_up';
};
export async function trigger(options: TriggerOptions) {
    if (options.event !== 'member_sign_up') {
        throw new errors.IncorrectUsageError({
            message: 'Member signup is the only supported event right now. More may be added later'
        });
    }

    if (!labs.isSet('automations')) {
        return;
    }

    await repository.trigger(options);

    requestPoll();
}

export async function fetchAndLockSteps(...args: Parameters<AutomationsRepository['fetchAndLockSteps']>) {
    return await repository.fetchAndLockSteps(...args);
}

export async function finishStepAndEnqueueNext(...args: Parameters<AutomationsRepository['finishStepAndEnqueueNext']>) {
    return await repository.finishStepAndEnqueueNext(...args);
}

export async function markStepTerminal(...args: Parameters<AutomationsRepository['markStepTerminal']>) {
    return await repository.markStepTerminal(...args);
}

export async function retryStep(...args: Parameters<AutomationsRepository['retryStep']>) {
    return await repository.retryStep(...args);
}

export async function recordEmailSent(...args: Parameters<AutomationsRepository['recordEmailSent']>) {
    return await repository.recordEmailSent(...args);
}

export async function getAutomatedEmailRecipientsByMailgunIds(
    ...args: Parameters<AutomationsRepository['getAutomatedEmailRecipientsByMailgunIds']>
) {
    return await repository.getAutomatedEmailRecipientsByMailgunIds(...args);
}

export async function trackEmailDeliveredAndOpened(
    ...args: Parameters<AutomationsRepository['trackEmailDeliveredAndOpened']>
) {
    return await repository.trackEmailDeliveredAndOpened(...args);
}

export async function trackEmailClicked(
    ...args: Parameters<AutomationsRepository['trackEmailClicked']>
) {
    await repository.trackEmailClicked(...args);
}
