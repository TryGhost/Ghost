import { MetafieldDefinitionsService } from './definitions-service';
import { MetafieldValuesService } from './values-service';
import type { Audience } from './access';
import { MetafieldBindingsService } from './bindings-service';
import { recordMetafieldAction, type RecordMetafieldAction } from './actions';
import { resolveMaxDefinitions } from './config';

export type { Metafield } from './models';
export type { RequestContext } from './actions';
export { actingContext, adminWriteOrigin } from './actions';
export type { BoundField } from './bindings-service';
export type { MetafieldChangeEvent, WriteOrigin, WrittenBy } from './schema';

// Which door a request came through, which is what decides how much of a member's
// answers it may see or change. Required wherever that is asked, so a new caller
// has to name itself rather than inherit an answer by default.
export {
  ADMIN,
  INTERNAL,
  MEMBERS,
  MEMBER_ACCESS,
  canWrite,
  type Audience,
  type MemberAccess,
} from './access';

// Three services from one module, split along aggregate boundaries rather than
// technical layers: `definitions` owns the field definitions, which belong to the
// site's settings, `values` owns the per-member values, which belong to the
// member, and `bindings` owns which of a source's ports writes into which field.
// The values service reads the definitions table directly for the reference data
// it needs — a value referencing its definition, not a boundary crossing.
//
// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let definitions: MetafieldDefinitionsService | undefined;
export let values: MetafieldValuesService | undefined;
export let bindings: MetafieldBindingsService | undefined;

/**
 * The values a set of members holds, as one audience reads them.
 *
 * Null when this audience has no field to be told about, which tells the caller to leave
 * the `metafields` key off its payload rather than send an empty object: a key added to a
 * response cannot be withdrawn without breaking whoever started reading it, and most sites
 * have never defined a field, so those sites keep the payload they had before this feature
 * existed.
 *
 * The services are passed in rather than read off this module, so a caller that already
 * holds them (the members BREAD service) and one that does not (the webhook serializer,
 * which uses the singletons below) get the same answer from the same place. Two readers
 * asking this separately is two chances to disagree about what a site with no fields
 * should send.
 */
export async function readValuesForMembers(
  services: { definitions: MetafieldDefinitionsService; values: MetafieldValuesService },
  memberIds: string[],
  audience: Audience,
): Promise<Map<string, Record<string, unknown>> | null> {
  if (!(await services.definitions.hasAnyReadable(audience))) {
    return null;
  }

  return services.values.getValuesForMembers(memberIds, audience);
}

export function init(): void {
  // The three are constructed together below, so checking all of them keeps the "all or
  // none" invariant explicit rather than trusting one to stand in for the rest.
  if (definitions && values && bindings) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');

  const recordAction: RecordMetafieldAction = ({ context, verb, subject, details }) =>
    recordMetafieldAction({ Action: models.Action, context, verb, subject, details });

  // Resolved here, not in the service: reading config is this module's job, and
  // the service is handed a number. A getter rather than a value because the
  // ceiling is an operator setting that can change between requests, and a Ghost
  // container holds no state across them.
  const config = require('../../../shared/config');

  definitions = new MetafieldDefinitionsService({
    knex,
    recordAction,
    getMaxDefinitions: () => resolveMaxDefinitions(config.get('members:metafields:maxDefinitions')),
  });
  // The values service reads the field definitions straight from the table, so
  // it needs knex and the same ceiling — no handle on the definitions service.
  values = new MetafieldValuesService({
    knex,
    getMaxDefinitions: () => resolveMaxDefinitions(config.get('members:metafields:maxDefinitions')),
  });

  // Built after the values, which is what a binding routes into. It has no handle on the
  // definitions: making a field is not part of binding to one, so a caller that needs both
  // asks for both.
  bindings = new MetafieldBindingsService({ knex, values });
}
