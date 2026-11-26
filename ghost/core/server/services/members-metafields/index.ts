import errors from '@tryghost/errors';
import { ActionLog } from '../../lib/action-log/action-log';
import { recordMemberDefinitionChanges } from '../../lib/action-log/custom-fields';
import { limitService } from '../limits';
import type { MetafieldDefinitionsService } from './metafields/definitions-service';
import { MemberMetafieldActivity } from './member-activity';
import type { MetafieldValuesService } from './metafields/values-service';
import { MEMBERS_RESOURCE, type Members } from './members-resource';
export { changedForMembers } from './members-resource';
import type { MetafieldBindingsService } from './metafields/bindings-service';
import { resolveMaxDefinitions } from './config';
import { definitionLimit } from './definition-limit';
import { customFields } from './custom-fields/namespace';
import { metafieldsFor } from './metafields/metafields';
import type { Namespaces } from './metafields/namespaces';
import type { FieldSource as ResourceFieldSource } from './metafields/queries';
import { meter, tracer } from '../../lib/tracing';
import { metafieldsTracking } from './metafields/tracking';

export type { Definition } from './metafields/models';
/** The members' fields as this site reads them, for every read here and in the domains that join them. */
export type FieldSource = ResourceFieldSource;
/** What each member holds for each field. */
export type MemberMetafieldValues = MetafieldValuesService<Members>;
export type { MemberMetafieldActivity } from './member-activity';
export {
  refusalError,
  type MetafieldPlan,
  type PlannedWrite,
  type Refusal,
} from './metafields/values-service';
/** Which member field each port another domain declares writes into. */
export type MemberBindings = MetafieldBindingsService<Members>;
/** The members' definitions, read and changed for every namespace. */
export type MemberDefinitions = MetafieldDefinitionsService;
export type { BoundField } from './metafields/bindings-service';
export type { FieldStatus, WriteOrigin, WrittenBy } from './metafields/schema';
export type { MetafieldChangeEvent, Members } from './members-resource';

// Who is asking decides which fields a read or write reaches, by each namespace's access policy.
// Every read and write takes one, so a new caller has to say who it is rather than get a default.
export { MEMBER_ACCESS, type MemberAccess } from '@tryghost/metafield-types';
export { GHOST, callerOf, writeOriginOf, type Caller } from './metafields/callers';

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
export let namespaces: Namespaces | undefined;
/** The fields as this site reads them, for every read here and in the domains that join them. */
export let fields: FieldSource | undefined;
export let definitions: MemberDefinitions | undefined;
export let values: MemberMetafieldValues | undefined;
/** The activity feed members' metafield writes leave. */
export let activity: MemberMetafieldActivity | undefined;
export let bindings: MemberBindings | undefined;

/**
 * Boot builds these before any request is served, so a call before then is a wiring fault and
 * throws.
 */
export function booted(): {
  namespaces: Namespaces;
  definitions: MemberDefinitions;
  values: MemberMetafieldValues;
  bindings: MemberBindings;
  activity: MemberMetafieldActivity;
} {
  if (!namespaces || !definitions || !values || !bindings || !activity) {
    throw new errors.IncorrectUsageError({
      message: 'Members metafields were used before boot initialised them.',
    });
  }
  return { namespaces, definitions, values, bindings, activity };
}

export function init(): void {
  // These are constructed together below, so checking all of them keeps the "all or
  // none" invariant explicit rather than trusting one to stand in for the rest.
  if (namespaces && fields && definitions && values && bindings && activity) {
    return;
  }

  const { knex } = require('../../data/db');

  // Resolved here, not in the service: reading config is this module's job, and
  // the service is handed a number. A getter rather than a value because the
  // ceiling is an operator setting that can change between requests, and a Ghost
  // container holds no state across them. It is Members' limit on each namespace's
  // fields, counted for each namespace alone.
  const config = require('../../../shared/config');
  const getMaxDefinitions = () =>
    resolveMaxDefinitions(config.get('members:metafields:maxDefinitions'));

  // Each write of a member's values is recorded on the member's activity feed, inside the write.
  activity = new MemberMetafieldActivity({ knex });
  // A field type still in development can be created only where its Labs flag is on.
  const labs = require('../../../shared/labs');

  ({ namespaces, fields, definitions, values, bindings } = metafieldsFor(MEMBERS_RESOURCE, {
    knex,
    // Custom fields are the one namespace registered on members so far, and the only one anyone
    // can define fields in or reach.
    namespaces: [customFields({ limitService })],
    definitionLimit: definitionLimit(getMaxDefinitions),
    maxDefinitions: getMaxDefinitions,
    // Each change to a definition is logged as a staff action inside the command that made it.
    onDefinitionUpdated: recordMemberDefinitionChanges(new ActionLog()),
    onValuesWritten: activity.record,
    tracking: metafieldsTracking({ tracer, meter }),
    labs,
  }));
}
