import type { Knex } from 'knex';
import { MetafieldBindingsService } from './bindings-service';
import type { OnDefinitionUpdated } from './changes';
import { MetafieldDefinitionsService } from './definitions-service';
import {
  createNamespaces,
  type CountLimit,
  type NamespaceRegistration,
  type Namespaces,
} from './namespaces';
import { fieldSource, type FieldSource } from './queries';
import type { MetafieldResource } from './resource';
import type { MetafieldsTracking } from './tracking';
import { MetafieldValuesService } from './values-service';

/**
 * Metafields on one resource: its namespaces, its fields as the site reads them, and the services
 * over its definitions, values and bindings. Each is built for that resource and only that one.
 */
export interface Metafields {
  namespaces: Namespaces;
  fields: FieldSource;
  definitions: MetafieldDefinitionsService;
  values: MetafieldValuesService;
  bindings: MetafieldBindingsService;
}

/**
 * Wires metafields for a resource from the namespaces registered on it and what the resource
 * decides for itself: how many definitions each namespace may hold, and how a change to a
 * definition is recorded. Each write of values is recorded in the resource's change events table.
 * A namespace nobody registered has no policy, so nobody reaches its fields.
 */
export function metafieldsFor(
  resource: MetafieldResource,
  wiring: {
    knex: Knex;
    namespaces: readonly NamespaceRegistration[];
    /** How many definitions each namespace may hold, in the resource's own words when refused. */
    definitionLimit: CountLimit;
    /** How many fields one write of values can name, asked each time as config can change. */
    maxDefinitions: () => number;
    /** Called with each change to a definition, inside the command's transaction. */
    onDefinitionUpdated: OnDefinitionUpdated;
    tracking: MetafieldsTracking;
    /** Asked on every create, as a type's flag can be switched on while Ghost runs. */
    labs: { isSet(flag: string): boolean };
  },
): Metafields {
  const { knex, tracking } = wiring;
  const namespaces = createNamespaces(wiring.namespaces, {
    definitionLimit: wiring.definitionLimit,
  });
  const fields = fieldSource(resource, namespaces);
  const definitions = new MetafieldDefinitionsService({
    knex,
    fields,
    onDefinitionUpdated: wiring.onDefinitionUpdated,
    namespaces,
    tracking,
    labs: wiring.labs,
  });
  // The values service reads the definitions itself, through the same field source, for the
  // reference data it needs: a value referencing its definition, not a boundary crossing.
  const values = new MetafieldValuesService({
    knex,
    resource,
    fields,
    namespaces,
    getMaxDefinitions: wiring.maxDefinitions,
    tracking,
  });
  // Built after the values, which is what a binding routes into. Making a definition is not part
  // of binding to one, so it has no handle on the definitions.
  const bindings = new MetafieldBindingsService({
    knex,
    resource,
    fields,
    values,
  });
  return { namespaces, fields, definitions, values, bindings };
}
