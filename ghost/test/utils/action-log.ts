import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import { z } from 'zod';

/** An action as the actions API returns it, with its stored context parsed. */
const LoggedAction = z
  .object({
    id: z.string(),
    event: z.string(),
    resource_type: z.string(),
    resource_id: z.string().nullable(),
    actor_type: z.string(),
    actor_id: z.string(),
    context: z.string().nullable(),
    created_at: z.string(),
    actor: z.record(z.string(), z.unknown()).optional(),
    resource: z.record(z.string(), z.unknown()).optional(),
  })
  .transform(({ context, ...action }) => ({
    ...action,
    context: context === null ? null : z.record(z.string(), z.unknown()).parse(JSON.parse(context)),
  }));
export type LoggedAction = z.output<typeof LoggedAction>;

const ActionsResponse = z.object({ actions: z.array(LoggedAction) });

/** An Admin API test agent, as far as reading actions needs one. */
export interface ActionLogAgent {
  get(path: string): { expectStatus(status: number): PromiseLike<{ body: unknown }> };
}

/** Which actions to read: those of one resource type, and of one resource when it is given. */
export interface ActionsAbout {
  resourceType: string;
  /** Leave out for every resource of the type. Null is an action about no single resource. */
  resourceId?: string | null;
}

/** An action a test expects. Only what is given is compared. */
export interface ExpectedAction {
  event: string;
  /** Null is an action about no single resource. */
  resourceId?: string | null;
  actor?: { type: 'user' | 'integration'; id: string };
  /** The whole stored context, or null for an action stored with none. */
  context?: Record<string, unknown> | null;
  /** The resource as the API includes it. An empty object is a resource that no longer exists. */
  resource?: Record<string, unknown>;
}

/**
 * Reads actions through the actions API with their actor and resource included, as Admin's
 * History page does, so an action that reads correctly here reads correctly in Admin.
 *
 * Returns them oldest first. Actions are sorted by id, which follows the order they were written
 * in. The API orders by `created_at` alone, which is stored to the second, so it returns actions
 * written in the same second in no reliable order.
 */
export async function readActions(
  agent: ActionLogAgent,
  about: ActionsAbout,
): Promise<LoggedAction[]> {
  const filter = encodeURIComponent(`resource_type:${about.resourceType}`);
  const { body } = await agent
    .get(`actions/?filter=${filter}&include=actor,resource&limit=all`)
    .expectStatus(200);
  return ActionsResponse.parse(body)
    .actions.filter(
      (action) => about.resourceId === undefined || action.resource_id === about.resourceId,
    )
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * Asserts that the actions about a resource are exactly the expected ones, in the order they
 * were written. Use it in a domain's own API tests, after the commands under test:
 *
 *     await assertActions(agent, { resourceType: 'gift_link', resourceId: post.id }, [
 *       { event: 'added', actor: owner },
 *       { event: 'edited', actor: owner, context: { action_name: 'reset' } },
 *     ]);
 *
 * An unexpected extra action fails the assertion, as does a missing one.
 *
 * A Bookshelf model writes its action after its transaction commits, without the request waiting
 * for it, so an action can land shortly after the response. While fewer actions than expected
 * have been written, this reads again for up to two seconds before comparing.
 */
export async function assertActions(
  agent: ActionLogAgent,
  about: ActionsAbout,
  expected: ExpectedAction[],
): Promise<LoggedAction[]> {
  let actions = await readActions(agent, about);
  for (let attempt = 0; actions.length < expected.length && attempt < 20; attempt += 1) {
    await wait(100);
    actions = await readActions(agent, about);
  }
  const seen = actions.map((action, index) => {
    const wanted = expected[index];
    return {
      event: action.event,
      ...(wanted?.resourceId !== undefined && { resourceId: action.resource_id }),
      ...(wanted?.actor && { actor: { type: action.actor_type, id: action.actor_id } }),
      ...(wanted?.context !== undefined && { context: action.context }),
      ...(wanted?.resource && { resource: action.resource ?? {} }),
    };
  });
  assert.deepEqual(seen, expected, `the actions about ${about.resourceType}`);
  return actions;
}
