import type { Knex } from 'knex';
import { MetafieldDefinitionsService } from './definitions-service';
import { MetafieldValuesService } from './values-service';
import { MetafieldBindingsService } from './members/bindings-service';
import { recordMetafieldAction, type ActionRecorder, type RecordMetafieldAction } from './actions';
import { maxDefinitionsFor } from './config';
import { MEMBERS_ENTITY } from './entities';
import type { MetafieldEntity } from './entity';

export type { Metafield } from './models';
export type { RequestContext } from './actions';
export { actingContext, adminWriteOrigin } from './actions';
export type { BoundField } from './members/bindings-service';
export type { MetafieldChangeEvent } from './members/change-events';
export type { WriteOrigin, WrittenBy } from './schema';
export type { MetafieldEntity, OriginOf } from './entity';
export { MEMBERS_ENTITY } from './entities';

// Which door a request came through, which is what decides how much of a record's
// values it may see or change. Required wherever that is asked, so a new caller
// has to name itself rather than inherit an answer by default.
export {
  ADMIN,
  INTERNAL,
  MEMBERS,
  MEMBER_ACCESS,
  type Access,
  type Audience,
  type MemberAccess,
} from './access';

/**
 * One entity's metafields, as two services split along aggregate boundaries rather than
 * technical layers: `definitions` owns the field definitions, which belong to the site's
 * settings, and `values` owns each record's values, which belong to the record. The
 * values service reads the definitions table directly for the reference data it needs —
 * a value referencing its definition, not a boundary crossing.
 */
export interface EntityMetafields<E extends MetafieldEntity> {
  entity: E;
  definitions: MetafieldDefinitionsService;
  values: MetafieldValuesService<E>;
}

function createMetafields<E extends MetafieldEntity>(
  entity: E,
  {
    knex,
    Action,
    config,
  }: { knex: Knex; Action: ActionRecorder; config: { get(key: string): unknown } },
): EntityMetafields<E> {
  const recordAction: RecordMetafieldAction = ({ context, verb, subject, details }) =>
    recordMetafieldAction({ Action, entity, context, verb, subject, details });
  // Resolved here, not in the service: reading config is this module's job, and the
  // services are handed the ceiling.
  const getMaxDefinitions = maxDefinitionsFor(entity, config);

  return {
    entity,
    definitions: new MetafieldDefinitionsService({ knex, entity, recordAction, getMaxDefinitions }),
    values: new MetafieldValuesService({ knex, entity, getMaxDefinitions }),
  };
}

/**
 * Members' metafields, and the bindings that route what a checkout collects into them.
 * Bindings have no handle on the definitions: making a field is not part of binding to
 * one, so a caller that needs both asks for both.
 */
export type MemberMetafields = EntityMetafields<typeof MEMBERS_ENTITY> & {
  bindings: MetafieldBindingsService;
};

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let members: MemberMetafields | undefined;

export function init(): void {
  if (members) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');
  const config = require('../../../shared/config');
  const deps = { knex, Action: models.Action, config };

  const memberMetafields = createMetafields(MEMBERS_ENTITY, deps);
  members = {
    ...memberMetafields,
    bindings: new MetafieldBindingsService({ knex, values: memberMetafields.values }),
  };
}
