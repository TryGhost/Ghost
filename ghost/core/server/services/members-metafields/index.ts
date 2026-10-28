import errors from '@tryghost/errors';
import { limitService } from '../limits';
import { MetafieldDefinitionsService } from './definitions-service';
import { MetafieldValuesService } from './values-service';
import { MetafieldBindingsService } from './bindings-service';
import { recordMetafieldAction, type RecordMetafieldAction } from './actions';
import { resolveMaxDefinitions } from './config';
import { customFields } from './custom-fields';
import { createNamespaces, type Namespaces } from './namespaces';
import { fieldSource, type FieldSource } from './queries';
import { tracer } from '../../lib/tracing';
import { metafieldsTracking } from './tracking';

export type { Metafield } from './models';
export type { FieldSource } from './queries';
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
// The values service reads the definitions itself, through the same field source, for
// the reference data it needs — a value referencing its definition, not a boundary
// crossing.
//
// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
/** The namespaces fields can be defined in, and the policy each one's fields follow. */
export let namespaces: Namespaces | undefined;
/** The fields as this site reads them, for every read here and in the domains that join them. */
export let fields: FieldSource | undefined;
export let definitions: MetafieldDefinitionsService | undefined;
export let values: MetafieldValuesService | undefined;
export let bindings: MetafieldBindingsService | undefined;

/**
 * Boot builds these before any request is served, so a call before then is a wiring fault and
 * throws.
 */
export function booted(): {
  namespaces: Namespaces;
  definitions: MetafieldDefinitionsService;
} {
  if (!namespaces || !definitions) {
    throw new errors.IncorrectUsageError({
      message: 'Members metafields were used before boot initialised them.',
    });
  }
  return { namespaces, definitions };
}

export function init(): void {
  // The five are constructed together below, so checking all of them keeps the "all or
  // none" invariant explicit rather than trusting one to stand in for the rest.
  if (namespaces && fields && definitions && values && bindings) {
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
  const getMaxDefinitions = () =>
    resolveMaxDefinitions(config.get('members:metafields:maxDefinitions'));

  // Custom fields are the one application of metafields so far, and the only namespace
  // anyone can define fields in.
  namespaces = createNamespaces([customFields({ limitService, getMaxDefinitions })]);
  fields = fieldSource(namespaces);

  const tracking = metafieldsTracking(tracer);
  definitions = new MetafieldDefinitionsService({
    knex,
    fields,
    recordAction,
    namespaces,
    tracking,
  });
  // The values service reads the field definitions itself, so it needs knex, the fields and
  // the ceiling, which also caps how many values one request can carry — no handle on the
  // definitions service.
  values = new MetafieldValuesService({ knex, fields, getMaxDefinitions, tracking });

  // Built after the values, which is what a binding routes into. It has no handle on the
  // definitions: making a field is not part of binding to one, so a caller that needs both
  // asks for both.
  bindings = new MetafieldBindingsService({ knex, fields, values });
}
