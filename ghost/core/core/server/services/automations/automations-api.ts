// @ts-expect-error This module lacks type definitions.
import domainEvents from '@tryghost/domain-events';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import ObjectId from 'bson-objectid';
import { z } from 'zod';
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import labs from '../../../shared/labs';
// @ts-expect-error This module lacks type definitions.
import settingsCache from '../../../shared/settings-cache';
import { knex } from '../../data/db';
// @ts-expect-error This module lacks type definitions.
import lexicalLib from '../../lib/lexical';
// @ts-expect-error This module lacks type definitions.
import requestExternal from '../../lib/request-external';
// @ts-expect-error This module lacks type definitions.
import { create as createTinybirdClient } from '../stats/utils/tinybird';
// @ts-expect-error This module lacks type definitions.
import TinybirdServiceWrapper from '../tinybird';
import { entryDate, getEntryStatsWindow, parseEntryStatsOptions } from './automation-entry-stats';
import {
  browseMemberSearch,
  normalizeMemberSearch,
  searchCursorScope,
} from './automation-member-search';
import { decodeRunCursor, encodeRunCursor, type RunCursorScope } from './automation-run-cursor';
import type {
  Automation,
  AutomationsRepository,
  EditAutomationData,
} from './automations-repository';
import { createDatabaseAutomationsRepository } from './database-automations-repository';
import { StartAutomationsPollEvent } from './events/start-automations-poll-event';
import { parseFakeWaitHoursMultiplier } from './fake-wait-hours-multiplier';
import {
  EMPTY_AUTOMATION_STATS,
  fetchAutomationPerformanceStats,
  fetchAutomationRuns,
  fetchAutomationStats,
} from './tinybird-automation-stats';

const MAX_AUTOMATION_ACTIONS = 50;
const RUN_PAGE_SIZE = 50;
const MAX_WAIT_HOURS = 720; // 30 days

const messages = {
  invalidRunOrder: 'Automation run order must be one of: created_at desc, created_at asc.',
  invalidRunStatus: 'Automation run status must be one of: in_progress, completed, exited_early.',
  tinybirdRunsFailed: 'Could not load Tinybird automation runs.',
  tinybirdEntriesOutsideRange: 'Tinybird returned entries outside the requested range.',
  tinybirdPerformanceStatsFailed: 'Could not load Tinybird automation performance stats.',

  automationNotFound: 'Automation not found.',
  runNotFound: 'Automation run not found.',
  automationActionNotFound: 'Automation action not found.',
  invalidAutomationCreationPayload: 'Invalid automation payload.',
  invalidAutomationEditPayload: 'Automation edit payload must include status, actions, and edges.',
  invalidAutomationStatus: 'Automation status must be one of: active, inactive.',
  duplicateAutomationActionIdentity: 'Automation action identifiers must be unique.',
  invalidAutomationEdgeEndpoint: 'Automation edges must reference actions in the submitted graph.',
  duplicateAutomationEdge: 'Automation edges must be unique.',
  invalidAutomationEdge: 'Automation edges cannot connect an action to itself.',
  invalidAutomationGraphShape:
    'Automation graph must be a single linear path without branches or cycles.',
  emptyEmailSubjectWhenActive: 'Active automations require a subject line for every email.',
  emptyEmailBodyWhenActive: 'Active automations require a body for every email.',
  invalidEmailLexical: 'Email lexical must be a well-formed Lexical document.',
};

const objectIdSchema = z.string().refine((value) => ObjectId.isValid(value));

const waitActionSchema = z.object({
  id: objectIdSchema,
  type: z.literal('wait'),
  data: z.object({
    wait_hours: z.number().int().positive().max(MAX_WAIT_HOURS),
  }),
});

const sendEmailActionSchema = z.object({
  id: objectIdSchema,
  type: z.literal('send_email'),
  data: z.object({
    email_subject: z.string(),
    email_lexical: z.string(),
    email_design_setting_id: z.string().min(1),
  }),
});

const edgeSchema = z.object({
  source_action_id: objectIdSchema,
  target_action_id: objectIdSchema,
});

const automationShape = {
  name: z.string().trim().min(1).max(191),
  description: z.string().trim().max(2000),
  status: z.enum(['active', 'inactive']),
  actions: z
    .array(z.discriminatedUnion('type', [waitActionSchema, sendEmailActionSchema]))
    .min(1)
    .max(MAX_AUTOMATION_ACTIONS),
  edges: z.array(edgeSchema),
};

const defaultTriggerShape = {
  trigger_tier_scope: z.enum(['free', 'all_paid']).nullable().optional(),
  trigger_tier_ids: z.null().optional(),
};
const selectedPaidTriggerShape = {
  trigger_tier_scope: z.literal('selected_paid'),
  trigger_tier_ids: z
    .array(objectIdSchema)
    .min(1)
    .transform((ids) => [...new Set(ids)]),
};

const addAutomationDataSchema = z.discriminatedUnion('trigger_tier_scope', [
  z.strictObject({ ...automationShape, ...defaultTriggerShape }),
  z.strictObject({
    ...automationShape,
    ...selectedPaidTriggerShape,
  }),
]);

export type AddAutomationData = z.infer<typeof addAutomationDataSchema>;

const editAutomationDataSchema = z
  .object({
    ...automationShape,
    name: automationShape.name.optional(),
    description: automationShape.description.optional(),
  })
  .and(
    z.discriminatedUnion('trigger_tier_scope', [
      z.object(defaultTriggerShape),
      z.object(selectedPaidTriggerShape),
    ]),
  );

const repository = createDatabaseAutomationsRepository({
  knex,
  fakeWaitHoursMultiplier: parseFakeWaitHoursMultiplier(
    config.get('automations:fakeWaitHoursMultiplier'),
  ),
});

function getTinybirdClient() {
  if (!config.get('tinybird:stats')) {
    return null;
  }
  try {
    const tinybirdService = TinybirdServiceWrapper.instance;
    if (!tinybirdService?.getToken()?.token) {
      return null;
    }
    return createTinybirdClient({
      config,
      // Fall back to MySQL after the first failed attempt.
      request: requestExternal.extend({ retry: { limit: 0 } }),
      settingsCache,
      tinybirdService,
    });
  } catch (error) {
    logging.error('Error preparing Tinybird automation stats client:', error);
    return null;
  }
}

export async function browse() {
  const tinybirdClient = getTinybirdClient();
  if (!tinybirdClient) {
    return await repository.browse({ includeStats: true });
  }

  const [browseResult, stats] = await Promise.all([
    repository.browse({ includeStats: false }),
    fetchAutomationStats(tinybirdClient),
  ]);
  if (stats === null) {
    return await repository.browse({ includeStats: true });
  }

  return {
    ...browseResult,
    data: browseResult.data.map((automation) => ({
      ...automation,
      stats: stats.get(automation.id) ?? { ...EMPTY_AUTOMATION_STATS },
    })),
  };
}

export async function getNumberOfAutomations(): Promise<number> {
  return await repository.getNumberOfAutomations();
}

export async function read(automationId: string) {
  const automation = await repository.getById(automationId);

  if (!automation) {
    throw new errors.NotFoundError({
      message: tpl(messages.automationNotFound),
    });
  }

  return automation;
}

export async function readPerformanceStats(automationId: string, options: unknown = {}) {
  const exists = await repository.exists(automationId);
  if (!exists) {
    throw new errors.NotFoundError({ message: tpl(messages.automationNotFound) });
  }

  const client = getTinybirdClient();
  if (!client) {
    throw new errors.InternalServerError({
      message: tpl(messages.tinybirdPerformanceStatsFailed),
    });
  }
  const { timezone, window: requestedWindow } = parseEntryStatsOptions(options);
  const stats = await fetchAutomationPerformanceStats(client, automationId, {
    timezone,
    ...(requestedWindow
      ? { dateFrom: requestedWindow.date_from, dateTo: requestedWindow.date_to }
      : {}),
  });
  if (stats === null) {
    throw new errors.InternalServerError({
      message: tpl(messages.tinybirdPerformanceStatsFailed),
    });
  }
  const returnedWindow = getEntryStatsWindow(stats.entries, timezone);
  const entryWindow = requestedWindow
    ? { ...requestedWindow, bucket: returnedWindow.bucket }
    : returnedWindow;
  if (
    stats.entries.some(({ date }) => {
      const day = entryDate(date, timezone);
      return day < entryWindow.date_from || day >= entryWindow.date_to;
    })
  ) {
    throw new errors.InternalServerError({ message: tpl(messages.tinybirdEntriesOutsideRange) });
  }
  return {
    automation_id: automationId,
    ...stats,
    entry_window: entryWindow,
  };
}

export async function browseRuns(automationId: string, options: Record<string, unknown> = {}) {
  const { status, order, cursor } = options;
  const query = normalizeMemberSearch(options.search);
  // Initial member search spans all time and statuses; browse filters stay independent.
  const { window: entryWindow, timezone } = parseEntryStatsOptions(query ? {} : options);
  const parsedStatus = z
    .enum(['in_progress', 'completed', 'exited_early'])
    .optional()
    .safeParse(query ? undefined : status);
  if (!parsedStatus.success) {
    throw new errors.ValidationError({
      message: tpl(messages.invalidRunStatus),
    });
  }
  const parsedOrder = z.enum(['created_at desc', 'created_at asc']).optional().safeParse(order);
  if (!parsedOrder.success) {
    throw new errors.ValidationError({
      message: tpl(messages.invalidRunOrder),
    });
  }
  const requestedScope: RunCursorScope = {
    automation_id: automationId,
    date_from: entryWindow?.date_from ?? null,
    date_to: entryWindow?.date_to ?? null,
    timezone,
    status: parsedStatus.data ?? null,
    direction: parsedOrder.data === 'created_at asc' ? 'asc' : 'desc',
  };
  const searchScope = query
    ? searchCursorScope(
        requestedScope,
        config.get('tinybird:stats:id') || settingsCache.get('site_uuid'),
        query,
      )
    : undefined;
  const continuation =
    cursor === undefined
      ? undefined
      : decodeRunCursor(cursor, searchScope ?? requestedScope, {
          preserveEndDate: !query && options.date_to === undefined,
        });
  const scope = continuation?.scope ?? requestedScope;
  const exists = await repository.exists(automationId);
  if (!exists) {
    throw new errors.NotFoundError({ message: tpl(messages.automationNotFound) });
  }
  const client = getTinybirdClient();
  if (!client) {
    throw new errors.InternalServerError({ message: tpl(messages.tinybirdRunsFailed) });
  }

  if (searchScope) {
    return browseMemberSearch(repository, client, searchScope, query, continuation?.position);
  }

  // One extra row tells us whether a next page exists without a separate count.
  const rows = await fetchAutomationRuns(client, automationId, {
    status: parsedStatus.data,
    direction: scope.direction,
    limit: RUN_PAGE_SIZE + 1,
    timezone,
    dateFrom: scope.date_from ?? undefined,
    dateTo: scope.date_to ?? undefined,
    after: continuation?.position,
  });
  if (rows === null) {
    throw new errors.InternalServerError({ message: tpl(messages.tinybirdRunsFailed) });
  }
  const runs = rows.slice(0, RUN_PAGE_SIZE);
  const nextCursor =
    rows.length > RUN_PAGE_SIZE ? encodeRunCursor(scope, runs[runs.length - 1]) : null;
  // Keep member details in Core; a deleted member must not remove a run from this page.
  const members = await repository.getRunMembers(
    automationId,
    runs.map((run) => run.id),
  );
  return {
    data: runs.map((run) => ({ ...run, member: members.get(run.id) ?? null })),
    meta: { pagination: { limit: RUN_PAGE_SIZE, next_cursor: nextCursor } },
  };
}

export async function readRunHistory(automationId: string, runId: string) {
  const exists = await repository.exists(automationId);
  if (!exists) {
    throw new errors.NotFoundError({ message: tpl(messages.automationNotFound) });
  }
  const history = await repository.getRunHistory(automationId, runId);
  if (!history) {
    throw new errors.NotFoundError({ message: tpl(messages.runNotFound) });
  }
  return history;
}

export async function browseActionLinks(automationId: string, actionId: string) {
  const links = await repository.getAutomationActionLinks(automationId, actionId);

  if (!links) {
    throw new errors.NotFoundError({
      message: tpl(messages.automationActionNotFound),
    });
  }

  return links;
}

export async function add(data: unknown) {
  const result = addAutomationDataSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throwValidationError(
      buildInvalidAutomationPayloadMessage(
        result.error.issues,
        messages.invalidAutomationCreationPayload,
      ),
      String(issue.path[0] ?? 'automations'),
    );
  }
  await validateAutomationData(result.data);
  return await repository.add(result.data);
}

export async function edit(automationId: string, data: unknown) {
  const parsedData = await validateEditData(data);

  const automation = await repository.edit(automationId, parsedData);

  if (!automation) {
    throw new errors.NotFoundError({
      message: tpl(messages.automationNotFound),
    });
  }

  return automation;
}

async function validateEditData(data: unknown): Promise<EditAutomationData> {
  const result = editAutomationDataSchema.safeParse(data);

  if (!result.success) {
    if (result.error.issues.some((issue) => issue.path[0] === 'status')) {
      throwValidationError(messages.invalidAutomationStatus, 'status');
    }

    throwValidationError(
      buildInvalidAutomationPayloadMessage(
        result.error.issues,
        messages.invalidAutomationEditPayload,
      ),
    );
  }

  await validateAutomationData(result.data);
  return result.data;
}

async function validateAutomationData(data: Pick<Automation, 'status' | 'actions' | 'edges'>) {
  validateGraph(data.actions, data.edges);
  await validateEmailLexical(data.actions);
  validateActiveEmailSteps(data.status, data.actions);
}

async function validateEmailLexical(actions: Automation['actions']) {
  await Promise.all(
    actions.map(async (action) => {
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

      if (!(await lexicalLib.validate(lexical))) {
        throwValidationError(messages.invalidEmailLexical, 'actions');
      }
    }),
  );
}

// Drafts may persist empty email steps, but an active automation must have a
// complete subject and body for every email it sends — mirroring the editor's
// publish-time validation.
function validateActiveEmailSteps(status: Automation['status'], actions: Automation['actions']) {
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

function isEmptyParsedLexical(parsed: {
  root?: { children?: Array<{ type?: string; children?: unknown }> };
}): boolean {
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

function buildInvalidAutomationPayloadMessage(issues: z.core.$ZodIssue[], message: string) {
  if (!issues.length) {
    return message;
  }

  const issueSummaries = issues.slice(0, 3).map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'payload';
    return `${path}: ${issue.message}`;
  });

  return `${message} ${issueSummaries.join('; ')}.`;
}

function validateGraph(actions: Automation['actions'], edges: Automation['edges']) {
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
    if (
      !actionIdentities.has(edge.source_action_id) ||
      !actionIdentities.has(edge.target_action_id)
    ) {
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

function validateLinearGraph(
  actionIdentities: Set<string>,
  outgoing: Map<string, string>,
  incoming: Map<string, string>,
) {
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

  const heads = [...actionIdentities].filter((identity) => !incoming.has(identity));
  const tails = [...actionIdentities].filter((identity) => !outgoing.has(identity));

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
    property,
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
      message: 'Member signup is the only supported event right now. More may be added later',
    });
  }

  if (!labs.isSet('automations')) {
    return;
  }

  await repository.trigger(options);

  requestPoll();
}

export async function fetchAndLockSteps(
  ...args: Parameters<AutomationsRepository['fetchAndLockSteps']>
) {
  return await repository.fetchAndLockSteps(...args);
}

export async function finishStepAndEnqueueNext(
  ...args: Parameters<AutomationsRepository['finishStepAndEnqueueNext']>
) {
  return await repository.finishStepAndEnqueueNext(...args);
}

export async function markStepTerminal(
  ...args: Parameters<AutomationsRepository['markStepTerminal']>
) {
  return await repository.markStepTerminal(...args);
}

export async function retryStep(...args: Parameters<AutomationsRepository['retryStep']>) {
  return await repository.retryStep(...args);
}

export async function recordEmailSent(
  ...args: Parameters<AutomationsRepository['recordEmailSent']>
) {
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
