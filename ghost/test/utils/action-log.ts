import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

/** An action as the Actions API returns it, with its stored details parsed. */
const LoggedAction = z
  .object({
    id: z.string(),
    event: z.string(),
    resource_type: z.string(),
    resource_id: z.string().nullable(),
    actor_type: z.string(),
    actor_id: z.string(),
    context: z.string().nullable(),
    resource: z.record(z.string(), z.unknown()).nullish(),
  })
  .transform(({ context, resource, ...entry }) => ({
    ...entry,
    details: context === null ? null : z.record(z.string(), z.unknown()).parse(JSON.parse(context)),
    resource: resource ?? null,
  }));
export type LoggedAction = z.output<typeof LoggedAction>;

const ActionsResponse = z.object({ actions: z.array(LoggedAction) });

interface AdminAgent {
  get(path: string): { expectStatus(status: number): PromiseLike<{ body: unknown }> };
}

export interface ActionQuery {
  resourceType: string;
  /** Leave out to read actions for every event. */
  event?: string;
}

/**
 * Reads the action log through the Actions API, including each action's resource, the same way
 * Admin's History page does. An action that can be read here can also be shown in Admin.
 *
 * Actions are returned oldest first. They are sorted by id, which follows the order they were
 * logged in, even for actions logged in the same second.
 */
export async function readActions(agent: AdminAgent, query: ActionQuery): Promise<LoggedAction[]> {
  const filter = encodeURIComponent(
    [`resource_type:${query.resourceType}`, ...(query.event ? [`event:${query.event}`] : [])].join(
      '+',
    ),
  );
  const { body } = await agent
    .get(`actions/?filter=${filter}&include=actor,resource&limit=all`)
    .expectStatus(200);
  return ActionsResponse.parse(body).actions.sort((a, b) => (a.id < b.id ? -1 : 1));
}

export interface ExpectedAction extends ActionQuery {
  event: string;
  /**
   * Leave out to match any resource. Use null to match an action for a change with no single
   * resource.
   */
  resourceId?: string | null;
  actor?: { type: 'user' | 'integration'; id: string };
  /** Only the details given here are compared, so a test can name just the ones it is about. */
  details?: Record<string, unknown>;
}

function hasDetails(action: LoggedAction, details: Record<string, unknown>): boolean {
  return Object.entries(details).every(([key, value]) =>
    isDeepStrictEqual(action.details?.[key], value),
  );
}

/** Asserts that a change logged exactly one action matching everything given, and returns it. */
export async function assertActionLogged(
  agent: AdminAgent,
  expected: ExpectedAction,
): Promise<LoggedAction> {
  const actions = await readActions(agent, expected);
  const matching = actions.filter(
    (action) =>
      (expected.resourceId === undefined || action.resource_id === expected.resourceId) &&
      (!expected.actor ||
        (action.actor_type === expected.actor.type && action.actor_id === expected.actor.id)) &&
      (!expected.details || hasDetails(action, expected.details)),
  );
  assert.equal(
    matching.length,
    1,
    `Expected one matching "${expected.event}" ${expected.resourceType} action in the action log, among: ${JSON.stringify(actions.map((action) => action.details))}`,
  );
  return matching[0];
}
