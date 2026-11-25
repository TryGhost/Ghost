/**
 * How long one built instance lives, from longest to shortest.
 * - `process`: one instance for the whole process.
 * - `site`: one instance per site scope.
 */
export const LIFETIMES = ['process', 'site'] as const;

export type Lifetime = (typeof LIFETIMES)[number];

/** Whether something with lifetime `a` lives at least as long as something with lifetime `b`. */
export function outlives(a: Lifetime, b: Lifetime): boolean {
  return LIFETIMES.indexOf(a) <= LIFETIMES.indexOf(b);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyServiceDefinition = ServiceDefinition<any, any>;

export type Needs = Readonly<Record<string, AnyServiceDefinition>>;

/** The built instances handed over for a set of needs, keyed as the needs are. */
export type Resolved<N extends Needs> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly [K in keyof N]: N[K] extends ServiceDefinition<infer Service, any> ? Service : never;
};

/**
 * The lifetime of something that keeps no state of its own, such as an action:
 * that of the shortest-lived thing it needs.
 */
export function shortestLifetime(needs: Needs): Lifetime {
  return Object.values(needs).reduce<Lifetime>(
    (shortest, need) => (outlives(shortest, need.lifetime) ? need.lifetime : shortest),
    'process',
  );
}

/**
 * Describes how to build one service. It holds no instance: whoever builds the
 * service keeps it. A definition is also the key other definitions name in `needs`.
 */
export interface ServiceDefinition<Service, N extends Needs = Needs> {
  readonly name: string;
  readonly lifetime: Lifetime;
  readonly needs: N;
  /** Builds the instance from what it needs. Synchronous, so a service can be built on first use. */
  readonly create: (needs: Resolved<N>) => Service;
}

export function defineService<Service, const N extends Needs = Record<never, never>>(definition: {
  readonly name: string;
  readonly lifetime: Lifetime;
  readonly needs?: N;
  readonly create: (needs: Resolved<N>) => Service;
}): ServiceDefinition<Service, N> {
  return Object.freeze({
    name: definition.name,
    lifetime: definition.lifetime,
    needs: Object.freeze({ ...definition.needs }) as N,
    create: definition.create,
  });
}
