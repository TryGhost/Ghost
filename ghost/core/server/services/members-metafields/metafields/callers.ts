import errors from '@tryghost/errors';
import { z } from 'zod';
import type { Principal } from '../../../auth/principal';
import { unreachable } from '../../../lib/unreachable';

/**
 * Who is asking for a resource's metafields, in metafields' terms. A namespace's access policy
 * decides what each one may do; the rest says which one, for the policy's `owner` and `member`.
 *
 * Ghost works out who made a request separately for authorization, as a principal, and for the
 * records it keeps, as an actor. This file is the facade between those and metafields: it is the
 * only one that reads a principal or a request's context, so when they come together, only this
 * changes.
 */
export type Caller =
  | { kind: 'staff'; userId: string }
  | { kind: 'integration'; integrationId: string | null }
  | { kind: 'app'; installationId: string; actingFor: string | null }
  | { kind: 'member'; memberId: string }
  | { kind: 'anonymous' };

/**
 * Who is asking, as the core reads them: a whole caller where there is one, or a kind alone where
 * a read asks what any caller of that kind can see, such as which definitions a member is offered.
 */
export type Asking = Caller | { kind: Caller['kind'] };

/**
 * The id Ghost has as an app. An installation's id is an ObjectId, so no installed app can have
 * it.
 */
export const GHOST_APP_ID = 'ghost';

/**
 * Ghost itself: the app that owns the namespaces Ghost registers, such as custom fields, and
 * what its own processes read and write as. It reaches what an owner reaches, and no more.
 */
export const GHOST: Caller = { kind: 'app', installationId: GHOST_APP_ID, actingFor: null };

const Id = z.object({ id: z.string() });

/** The parts of auth's principal metafields reads, one entry for each of auth's kinds. */
const PrincipalSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), user: Id }),
  z.object({ kind: z.literal('integration'), integration: Id.nullable() }),
  z.object({ kind: z.literal('app'), app: Id, actingFor: Id.nullable() }),
  z.object({ kind: z.literal('internal') }),
  z.object({ kind: z.literal('anonymous') }),
]);
type PrincipalRead = z.infer<typeof PrincipalSchema>;

// Every principal auth can build reads as one of the above, so a kind auth adds fails to compile
// here until it is decided what it may do with metafields.
const readsEveryPrincipal: (principal: Principal) => PrincipalRead = (principal) => principal;
void readsEveryPrincipal;

/** The caller a principal is. Auth's internal principal is Ghost. */
export function callerOfPrincipal(principal: PrincipalRead): Caller {
  switch (principal.kind) {
    case 'user':
      return { kind: 'staff', userId: principal.user.id };
    case 'integration':
      return { kind: 'integration', integrationId: principal.integration?.id ?? null };
    case 'app':
      return {
        kind: 'app',
        installationId: principal.app.id,
        actingFor: principal.actingFor?.id ?? null,
      };
    case 'internal':
      return GHOST;
    case 'anonymous':
      return { kind: 'anonymous' };
    default:
      return unreachable(principal, 'principal');
  }
}

/**
 * What an API request's context says about who made it: the principal auth resolved, Ghost's own
 * internal context, the member signed in on the Members API, which resolves no principal, and the
 * older fields auth fills from the principal, for a context Ghost's own code built without one.
 */
const RequestContext = z
  .object({
    principal: PrincipalSchema.nullish().catch(null),
    internal: z.unknown().optional(),
    member: Id.nullish().catch(null),
    user: z.union([z.string(), z.number()]).nullish().catch(null),
    integration: Id.nullish().catch(null),
    api_key: z.unknown().optional(),
  })
  .catch({});

/**
 * The caller an API request is for, from the context the API framework hands its endpoint: its
 * principal when it names someone, else Ghost's internal context, else the signed-in member, else
 * the integration or staff user its older fields name. A context that names nobody is refused
 * rather than read as anyone, as no caller reaches these fields unnamed.
 */
export function callerOf(context: unknown): Caller {
  if (context === 'internal') {
    return GHOST;
  }
  const read = RequestContext.parse(context ?? {});
  if (read.principal && read.principal.kind !== 'anonymous') {
    return callerOfPrincipal(read.principal);
  }
  if (read.internal) {
    return GHOST;
  }
  if (read.member) {
    return { kind: 'member', memberId: read.member.id };
  }
  if (read.api_key) {
    return { kind: 'integration', integrationId: read.integration?.id ?? null };
  }
  if (read.user !== null && read.user !== undefined) {
    return { kind: 'staff', userId: String(read.user) };
  }
  throw new errors.NoPermissionError({
    message: 'Members metafields were asked for by a request that names nobody.',
  });
}
