import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { MetafieldDefinitionsService } from './definitions-service';
import { MetafieldValuesService } from './values-service';
import { MetafieldBindingsService } from './members/bindings-service';
import { recordMetafieldAction, type ActionRecorder, type RecordMetafieldAction } from './actions';
import { maxDefinitionsFor } from './config';
import { metafieldEntities, type MetafieldEntity } from './entity';

export type { Metafield } from './models';
export type { RequestContext } from './actions';
export { actingContext, adminWriteOrigin } from './actions';
export type { BoundField } from './members/bindings-service';
export type { MetafieldChangeEvent } from './members/change-events';
export type { WriteOrigin, WrittenBy } from './schema';
export type { MetafieldEntity } from './entity';

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
export interface EntityMetafields {
  entity: MetafieldEntity;
  definitions: MetafieldDefinitionsService;
  values: MetafieldValuesService;
}

function createMetafields(
  entity: MetafieldEntity,
  {
    knex,
    Action,
    config,
  }: { knex: Knex; Action: ActionRecorder; config: { get(key: string): unknown } },
): EntityMetafields {
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

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
let byTable: ReadonlyMap<string, EntityMetafields> | undefined;

/**
 * Routes what a checkout collects into members' fields. Only members are created by a
 * checkout, so only members have bindings.
 */
export let bindings: MetafieldBindingsService | undefined;

function lookUp(built: ReadonlyMap<string, EntityMetafields> | undefined, table: string) {
  const metafields = built?.get(table);
  if (!metafields) {
    throw new errors.IncorrectUsageError({
      message: `${table} has no metafields: the schema gives it none, or they have not been built yet.`,
    });
  }
  return metafields;
}

/**
 * Builds the metafields of every entity the schema gives metafield tables to. Nothing is
 * kept unless all of it builds, so a failure leaves the service exactly as unbuilt as it was
 * and a later init starts again rather than mistaking half a build for a whole one.
 */
export function init(): void {
  if (byTable) {
    return;
  }

  const { knex } = require('../../data/db');
  const models = require('../../models');
  const config = require('../../../shared/config');
  const deps = { knex, Action: models.Action, config };

  const built = new Map(
    metafieldEntities().map((entity) => [entity.table, createMetafields(entity, deps)] as const),
  );
  // No handle on the definitions: making a field is not part of binding to one, so a
  // caller that needs both asks for both.
  const memberBindings = new MetafieldBindingsService({
    knex,
    values: lookUp(built, 'members').values,
  });

  byTable = built;
  bindings = memberBindings;
}

/**
 * The metafields of the entity whose records live in `table`. Throws for a table the schema
 * gives no metafield tables to, or before boot has built them.
 */
export function metafieldsFor(table: string): EntityMetafields {
  return lookUp(byTable, table);
}
