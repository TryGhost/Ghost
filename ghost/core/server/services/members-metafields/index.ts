import type { Knex } from 'knex';
import { limitService } from '../limits';
import { MetafieldDefinitionsService } from './definitions-service';
import { MetafieldValuesService } from './values-service';
import { MetafieldBindingsService } from './bindings-service';
import { recordMetafieldAction, type RecordMetafieldAction } from './actions';
import { resolveMaxDefinitions } from './config';
import { fieldsTable, type Plan } from './queries';

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
 * What this site's plan includes, from the limit its host sets. Read from the limit
 * service each time, as every other limit is, so it is never a stale copy.
 */
function sitePlan(): Plan {
  return { includesCustomFields: limitService.isDisabled('limitCustomFields') !== true };
}

/** The fields table as this site's plan lets it be read, for a domain that joins it itself. */
export function fieldsTableForSite(db: Knex, alias?: string): Knex.TableDescriptor {
  return fieldsTable(db, sitePlan(), alias);
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
    getPlan: sitePlan,
  });
  // The values service reads the field definitions straight from the table, so
  // it needs knex and the same ceiling — no handle on the definitions service.
  values = new MetafieldValuesService({
    knex,
    getMaxDefinitions: () => resolveMaxDefinitions(config.get('members:metafields:maxDefinitions')),
    getPlan: sitePlan,
  });

  // Built after the values, which is what a binding routes into. It has no handle on the
  // definitions: making a field is not part of binding to one, so a caller that needs both
  // asks for both.
  bindings = new MetafieldBindingsService({ knex, values, getPlan: sitePlan });
}
