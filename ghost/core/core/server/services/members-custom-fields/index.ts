import { CustomFieldDefinitionsService } from './definitions-service';
import { CustomFieldValuesService } from './values-service';
import { CustomFieldBindingsService } from './bindings-service';
import { recordCustomFieldAction, type RecordCustomFieldAction } from './actions';
import { resolveMaxDefinitions } from './config';

export type { CustomField } from './models';
export type { RequestContext } from './actions';
export { actingContext } from './actions';
export type { BoundField } from './bindings-service';
export type { WrittenBy } from './schema';

// Shared with anything that reads these values as part of its own projection.
// A value is stored as one row per leaf, so a reader that queries the rows needs
// the same rule for turning them back into a value — and that rule is pure, so it
// travels rather than being reimplemented. Reading the rows travels with it: which
// rows are unusable, and what to say about one, is the same judgement wherever the
// rows were fetched.
export { readableLeaves, valuesFromLeaves, type StoredLeaf } from './storage';
export { activeFields } from './queries';

// What a member's values are being set to, as one command, so the surfaces that
// write them name the same thing rather than each assembling their own arguments.
export { UpdateMetafields } from './commands';

// Three services from one module, split along aggregate boundaries rather than
// technical layers: `definitions` owns the field definitions, which belong to the
// site's settings, `values` owns the per-member values, which belong to the
// member, and `bindings` owns which of a source's ports writes into which field.
// The values service reads the definitions table directly for the reference data
// it needs — a value referencing its definition, not a boundary crossing.
//
// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let definitions: CustomFieldDefinitionsService | undefined;
export let values: CustomFieldValuesService | undefined;
export let bindings: CustomFieldBindingsService | undefined;

export function init(): void {
  // The three are constructed together below, so checking all of them keeps the "all or
  // none" invariant explicit rather than trusting one to stand in for the rest.
  if (definitions && values && bindings) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');

  const recordAction: RecordCustomFieldAction = ({ context, verb, subject, details }) =>
    recordCustomFieldAction({ Action: models.Action, context, verb, subject, details });

  // Resolved here, not in the service: reading config is this module's job, and
  // the service is handed a number. A getter rather than a value because the
  // ceiling is an operator setting that can change between requests, and a Ghost
  // container holds no state across them.
  const config = require('../../../shared/config');

  definitions = new CustomFieldDefinitionsService({
    knex,
    recordAction,
    getMaxDefinitions: () =>
      resolveMaxDefinitions(config.get('members:customFields:maxDefinitions')),
  });
  // The values service reads the field definitions straight from the table, so
  // it needs knex and the same ceiling — no handle on the definitions service.
  values = new CustomFieldValuesService({
    knex,
    getMaxDefinitions: () =>
      resolveMaxDefinitions(config.get('members:customFields:maxDefinitions')),
  });

  // Built after the values, which is what a binding routes into. It has no handle on the
  // definitions: making a field is not part of binding to one, so a caller that needs both
  // asks for both.
  bindings = new CustomFieldBindingsService({ knex, values });
}
