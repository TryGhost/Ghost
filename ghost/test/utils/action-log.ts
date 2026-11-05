import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import type { ActionEvent, ActionKind } from '../../core/server/lib/action-log/action-log';

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

/**
 * Reads a kind's action log through the Actions API, including each action's resource, the
 * same way Admin's History page does. An action that can be read here can also be shown in
 * Admin.
 *
 * Actions are returned oldest first. They are sorted by id, which follows the order they were
 * logged in, even for actions logged in the same second.
 */
export async function readActions(
  agent: AdminAgent,
  kind: ActionKind,
  { event }: { event?: ActionEvent } = {},
): Promise<LoggedAction[]> {
  const filter = encodeURIComponent(
    [`resource_type:${kind.resourceType}`, ...(event ? [`event:${event}`] : [])].join('+'),
  );
  const { body } = await agent
    .get(`actions/?filter=${filter}&include=actor,resource&limit=all`)
    .expectStatus(200);
  return ActionsResponse.parse(body).actions.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * What a change logged: one of the names its kind declares, or a plain event, which matches
 * only an action with no name, as the writer can't store both.
 */
type ExpectedChange<K extends ActionKind> =
  | { actionName: Extract<keyof K['actionNames'], string>; event?: never }
  | { event: ActionEvent; actionName?: never };

export type ExpectedAction<K extends ActionKind> = ExpectedChange<K> & {
  /**
   * Leave out to match any resource. Use null to match an action for a change with no single
   * resource.
   */
  resourceId?: string | null;
  actor?: { type: 'user' | 'integration'; id: string };
  /**
   * Only the details given here are compared, so a test can name just the ones it is about.
   * The action name is given as `actionName`.
   */
  details?: Record<string, unknown> & { action_name?: never };
};

function hasDetails(action: LoggedAction, details: Record<string, unknown>): boolean {
  return Object.entries(details).every(([key, value]) =>
    isDeepStrictEqual(action.details?.[key], value),
  );
}

/** Asserts that a change logged exactly one action matching everything given, and returns it. */
export async function assertActionLogged<K extends ActionKind>(
  agent: AdminAgent,
  kind: K,
  expected: ExpectedAction<K>,
): Promise<LoggedAction> {
  const event =
    expected.actionName === undefined ? expected.event : kind.actionNames[expected.actionName];
  const actions = await readActions(agent, kind, { event });
  const matching = actions.filter(
    (action) =>
      action.details?.action_name === expected.actionName &&
      (expected.resourceId === undefined || action.resource_id === expected.resourceId) &&
      (!expected.actor ||
        (action.actor_type === expected.actor.type && action.actor_id === expected.actor.id)) &&
      (!expected.details || hasDetails(action, expected.details)),
  );
  assert.equal(
    matching.length,
    1,
    `Expected one matching "${expected.actionName ?? event}" ${kind.resourceType} action in the action log, among: ${JSON.stringify(actions.map((action) => action.details))}`,
  );
  return matching[0];
}
