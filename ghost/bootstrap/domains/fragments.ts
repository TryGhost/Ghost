import { IncorrectUsageError } from '@tryghost/errors';
import {
  collectFragments,
  collectRoutes,
  type DomainFragment,
  type DomainRoute,
  type FragmentKind,
} from '@tryghost/kernel/domains/domain-layer';
import type {
  PermissionsDefinition,
  SchemaDefinition,
  SettingsDefinition,
} from '@tryghost/kernel/domains/definitions';
import { getDomainManifest } from './manifest';

/**
 * What the domains describe about themselves, for the central registries and
 * the web layer to read. This file loads only the kernel and each domain's
 * describing files (settings.ts, permissions.ts, schema.ts, http/routes.ts),
 * which import nothing but the kernel. It is safe however early it is loaded.
 */

type Fragments = {
  settings: SettingsDefinition;
  permissions: PermissionsDefinition;
  schema: SchemaDefinition;
};

/** Every domain's fragment of one kind, in domain order. */
export function domainFragments<Kind extends FragmentKind>(
  kind: Kind,
): DomainFragment<Fragments[Kind]>[] {
  return collectFragments<Fragments[Kind]>(getDomainManifest(), kind);
}

/** Every domain's routes for one HTTP surface. */
export function domainRoutes(surface: string): DomainRoute[] {
  return collectRoutes(getDomainManifest(), surface);
}

/** The settings each domain declares, merged group by group. */
export function domainSettingGroups(): Record<string, Record<string, unknown>> {
  const groups: Record<string, Record<string, unknown>> = {};
  for (const { value } of domainFragments('settings')) {
    for (const [group, settings] of Object.entries(value.groups)) {
      // A copy: the settings model adds to each setting it reads.
      groups[group] = { ...groups[group], ...structuredClone(settings) };
    }
  }
  return groups;
}

/** The tables each domain declares, by table name. */
export function domainTables(): Record<string, Readonly<Record<string, unknown>>> {
  // A copy, so nothing that reads the schema can change what a domain declared.
  return structuredClone(
    Object.assign({}, ...domainFragments('schema').map(({ value }) => value.tables)),
  );
}

/** The public settings each domain declares: setting key to published name. */
export function domainPublicSettings(): Record<string, string> {
  return Object.assign({}, ...domainFragments('settings').map(({ value }) => value.public ?? {}));
}

/** The setting keys each domain lets the settings API edit. */
export function domainEditableSettings(): string[] {
  return domainFragments('settings').flatMap(({ value }) => [...(value.editable ?? [])]);
}

/**
 * Places entries that domains declare into a central list that used to write
 * them out. Where order matters (tables are created in order; lists are hashed
 * and serialized in order) an entry keeps its place by being named where it
 * was. An entry no line names is added by `rest()`, at the end.
 *
 * @param what - What the entries are, for the error raised when a named entry
 * is not declared by any domain.
 */
export function placeFromDomains<Value>(what: string, declared: Record<string, Value>) {
  const placed = new Set<string>();
  return {
    place(...names: string[]): Record<string, Value> {
      return Object.fromEntries(
        names.map((name) => {
          if (!Object.hasOwn(declared, name)) {
            throw new IncorrectUsageError({
              message: `A central list places the ${what} ${name}, but no domain declares it.`,
            });
          }
          placed.add(name);
          return [name, declared[name]!];
        }),
      );
    },
    rest(): Record<string, Value> {
      return Object.fromEntries(Object.entries(declared).filter(([name]) => !placed.has(name)));
    },
  };
}
