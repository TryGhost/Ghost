import type { Admin7FeatureDefinition, Admin7Route } from './features';

/** Resolve prerequisites on this route, not just their raw Labs values. */
export function resolveAdmin7<Feature extends string>(
  definitions: Record<Feature, Admin7FeatureDefinition<Feature>>,
  flags: Readonly<Record<string, boolean | undefined>>,
  route: Admin7Route,
): Record<Feature, boolean> {
  const resolved: Partial<Record<Feature, boolean>> = {};
  const resolving = new Set<Feature>();

  function isEnabled(feature: Feature): boolean {
    if (resolved[feature] !== undefined) {
      return resolved[feature];
    }
    // A mistaken dependency cycle must never expose an unfinished milestone.
    if (resolving.has(feature)) {
      return false;
    }
    resolving.add(feature);
    const definition = definitions[feature];
    const enabled = Boolean(
      definition &&
      flags[definition.flag] === true &&
      definition.surfaces.includes(route.surface) &&
      !definition.excludedRoutes.some((pattern) => pattern.test(route.pathname)) &&
      definition.requires.every(isEnabled),
    );
    resolving.delete(feature);
    resolved[feature] = enabled;
    return enabled;
  }

  return Object.fromEntries(
    (Object.keys(definitions) as Feature[]).map((feature) => [feature, isEnabled(feature)]),
  ) as Record<Feature, boolean>;
}
