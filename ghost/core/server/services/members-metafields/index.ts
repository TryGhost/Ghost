import errors from '@tryghost/errors';
import { ActionLog } from '../../lib/action-log/action-log';
import { limitService } from '../limits';
import { MetafieldDefinitionsService } from './custom-fields/definitions-service';
import { MemberMetafieldValues } from './member-values';
import { MEMBERS_RESOURCE } from './members-resource';
import { MetafieldBindingsService } from './bindings-service';
import { resolveMaxDefinitions } from './custom-fields/config';
import { customFields, memberAccessPolicy } from './custom-fields/namespace';
import { createNamespaces, type Namespaces } from './metafields/namespaces';
import { fieldSource, type FieldSource as ResourceFieldSource } from './metafields/queries';
import type { Caller } from './callers';
import { meter, tracer } from '../../lib/tracing';
import { metafieldsTracking } from './metafields/tracking';

export type { Metafield } from './metafields/models';
/** The members' fields as this site reads them, for every read here and in the domains that join them. */
export type FieldSource = ResourceFieldSource<Caller>;
export type { MemberMetafieldValues } from './member-values';
export {
  refusalError,
  type MetafieldPlan,
  type PlannedWrite,
  type Refusal,
} from './metafields/values-service';
export type { MetafieldBindingsService } from './bindings-service';
export type { MetafieldDefinitionsService } from './custom-fields/definitions-service';
export { adminWriteOrigin } from './write-origin';
export type { BoundField } from './bindings-service';
export type { FieldStatus, WriteOrigin, WrittenBy } from './metafields/schema';
export type { MetafieldChangeEvent } from './members-resource';

// The API a request came through decides which custom fields it can read and write. Every read
// and write takes one, so a new caller has to state which API it is rather than get a default.
export { MEMBER_ACCESS, type Caller, type MemberAccess } from './callers';

// Three services from one module, split along aggregate boundaries rather than
// technical layers: `definitions` owns the field definitions, which belong to the
// site's settings, `values` owns the per-member values, which belong to the
// member, and `bindings` owns which of a source's ports writes into which field.
// The values service reads the definitions itself, through the same field source, for
// the reference data it needs — a value referencing its definition, not a boundary
// crossing.
//
// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
/** The namespaces fields can be defined in, each with its owner, limits and access policy. */
export let namespaces: Namespaces<Caller> | undefined;
/** The fields as this site reads them, for every read here and in the domains that join them. */
export let fields: FieldSource | undefined;
export let definitions: MetafieldDefinitionsService | undefined;
export let values: MemberMetafieldValues | undefined;
export let bindings: MetafieldBindingsService | undefined;

/**
 * Boot builds these before any request is served, so a call before then is a wiring fault and
 * throws.
 */
export function booted(): {
  namespaces: Namespaces<Caller>;
  definitions: MetafieldDefinitionsService;
  values: MemberMetafieldValues;
  bindings: MetafieldBindingsService;
} {
  if (!namespaces || !definitions || !values || !bindings) {
    throw new errors.IncorrectUsageError({
      message: 'Members metafields were used before boot initialised them.',
    });
  }
  return { namespaces, definitions, values, bindings };
}

export function init(): void {
  // The five are constructed together below, so checking all of them keeps the "all or
  // none" invariant explicit rather than trusting one to stand in for the rest.
  if (namespaces && fields && definitions && values && bindings) {
    return;
  }

  const { knex } = require('../../data/db');

  // Resolved here, not in the service: reading config is this module's job, and
  // the service is handed a number. A getter rather than a value because the
  // ceiling is an operator setting that can change between requests, and a Ghost
  // container holds no state across them.
  const config = require('../../../shared/config');
  const getMaxDefinitions = () =>
    resolveMaxDefinitions(config.get('members:metafields:maxDefinitions'));

  // Custom fields are the one application of metafields so far, and the only namespace
  // anyone can define fields in.
  namespaces = createNamespaces([customFields({ limitService, getMaxDefinitions })], {
    // Nobody owns another namespace yet, so a field stored in one, as an app's would be, is
    // reached by its member access, the way a custom field is. An app that owns its namespace
    // will state its own grants.
    unowned: memberAccessPolicy,
  });
  fields = fieldSource(MEMBERS_RESOURCE, namespaces);

  const tracking = metafieldsTracking({ tracer, meter });
  // A field type still in development can be created only where its Labs flag is on.
  const labs = require('../../../shared/labs');
  definitions = new MetafieldDefinitionsService({
    knex,
    fields,
    actionLog: new ActionLog(),
    namespaces,
    tracking,
    labs,
  });
  // The values service reads the field definitions itself, so it needs knex, the fields and
  // the ceiling, which also caps how many values one request can carry — no handle on the
  // definitions service.
  values = new MemberMetafieldValues({
    knex,
    resource: MEMBERS_RESOURCE,
    fields,
    namespaces,
    getMaxDefinitions,
    tracking,
  });

  // Built after the values, which is what a binding routes into. It has no handle on the
  // definitions: making a field is not part of binding to one, so a caller that needs both
  // asks for both.
  bindings = new MetafieldBindingsService({ knex, fields, values });
}
