/**
 * The small utilities that make each kind of file in a domain work. Each one
 * only describes: it tags what it is given and returns it, so importing a file
 * has no effect. The domain layer reads the tag and does the work.
 *
 * @see [Domains](../README.md#domains)
 */

const kind = Symbol.for('ghost.domain.definition');

export type DefinitionKind =
  | 'domain'
  | 'event'
  | 'job'
  | 'listener'
  | 'permissions'
  | 'routes'
  | 'schema'
  | 'settings';

type Tagged<Kind extends DefinitionKind, Value> = Value & { readonly [kind]: Kind };

function tag<Kind extends DefinitionKind, Value extends object>(
  name: Kind,
  value: Value,
): Tagged<Kind, Value> {
  Object.defineProperty(value, kind, { value: name });
  return value as Tagged<Kind, Value>;
}

// A fragment only describes, so nothing may change it after it is declared. A
// registry that needs to add to what it reads must take a copy.
function deepFreeze<Value>(value: Value): Value {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const member of Object.values(value)) {
      deepFreeze(member);
    }
  }
  return value;
}

/** The kind of definition a value is, or undefined when it is not one. */
export function definitionKind(value: unknown): DefinitionKind | undefined {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
    ? (value as { [kind]?: DefinitionKind })[kind]
    : undefined;
}

// --- events ---------------------------------------------------------------

/** Something that happened in a domain. Plain data only. */
export interface DomainEvent<Data> {
  readonly data: Data;
  readonly timestamp: Date;
}

export interface EventDefinition<Data> {
  /** The name the event bus knows the event by. Unique across Ghost. */
  readonly name: string;
  new (data: Data, timestamp?: Date): DomainEvent<Data>;
  create(data: Data, timestamp?: Date): DomainEvent<Data>;
}

/**
 * Declares an event. The name says what happened, in the past tense, and is the
 * key the event bus uses, so it must be unique.
 */
export function defineEvent<Data>(name: string): Tagged<'event', EventDefinition<Data>> {
  const Event = class implements DomainEvent<Data> {
    readonly data: Data;
    readonly timestamp: Date;
    constructor(data: Data, timestamp: Date = new Date()) {
      this.data = data;
      this.timestamp = timestamp;
    }
    static create(data: Data, timestamp?: Date) {
      return new Event(data, timestamp);
    }
  };
  Object.defineProperty(Event, 'name', { value: name });
  return tag('event', Event);
}

// --- listeners --------------------------------------------------------------

/**
 * The event a listener reacts to: an event class, or the name of one. A name is
 * for events that code outside the domains still publishes, which a listener
 * may not import.
 */
export type ListenedEvent = { readonly name: string } | string;

export interface ListenerDefinition<Event = unknown> {
  readonly event: ListenedEvent;
  readonly handle: (event: Event) => unknown;
}

/** Declares one reaction to an event. The domain layer subscribes it. */
export function defineListener<Event>(
  definition: ListenerDefinition<Event>,
): Tagged<'listener', ListenerDefinition<Event>> {
  return tag('listener', { ...definition });
}

// --- jobs -------------------------------------------------------------------

export type JobSchedule =
  /** Run once each time Ghost has finished starting, after an optional delay in milliseconds. */
  | { readonly once: 'boot'; readonly delay?: number | (() => number) }
  /** Run on a cron expression. */
  | { readonly cron: string };

export interface JobDefinition {
  readonly schedule: JobSchedule;
  readonly run: () => unknown;
}

/** Declares background work and when it runs. The domain layer schedules it. */
export function defineJob(definition: JobDefinition): Tagged<'job', JobDefinition> {
  return tag('job', { ...definition });
}

// --- routes -----------------------------------------------------------------

export interface RouteDefinition {
  /** Which HTTP surface the route belongs to. The web layer decides what each means. */
  readonly surface: string;
  readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  readonly path: string;
  /** Middleware by name. The web layer owns the functions. */
  readonly middleware?: readonly string[];
  /**
   * `<file>#<member>`, where the file is in the domain's http/ folder, named
   * without its extension. It is loaded on the first request.
   */
  readonly handler: `${string}#${string}`;
}

/** Declares a domain's routes as data. Nothing is loaded until a request arrives. */
export function defineRoutes(
  routes: readonly RouteDefinition[],
): Tagged<'routes', { readonly routes: readonly RouteDefinition[] }> {
  return deepFreeze(tag('routes', { routes: routes.map((route) => ({ ...route })) }));
}

// --- fragments --------------------------------------------------------------

export interface SettingDefinition {
  readonly defaultValue: unknown;
  readonly type: string;
  readonly validations?: Record<string, unknown>;
  readonly flags?: string;
}

export interface SettingsDefinition {
  /** Stored settings, by group and then by key. */
  readonly groups: Readonly<Record<string, Readonly<Record<string, SettingDefinition>>>>;
  /** Keys that are public, mapped to the name they are published under. */
  readonly public?: Readonly<Record<string, string>>;
  /** Keys the settings API accepts edits for. */
  readonly editable?: readonly string[];
  /**
   * Settings worked out from others. Each names the settings it reads and
   * receives their values as arguments, so it reaches for nothing itself.
   */
  readonly calculated?: Readonly<
    Record<
      string,
      {
        readonly inputs: readonly string[];
        readonly calculate: (inputs: Readonly<Record<string, unknown>>) => unknown;
      }
    >
  >;
}

export function defineSettings<Settings extends SettingsDefinition>(
  definition: Settings,
): Tagged<'settings', Settings> {
  return deepFreeze(tag('settings', definition));
}

export interface PermissionsDefinition {
  /** The actions that exist for each object type. */
  readonly objects: Readonly<Record<string, readonly string[]>>;
  /** For each role, the actions it is granted on each object type, or 'all'. */
  readonly roles?: Readonly<Record<string, Readonly<Record<string, 'all' | readonly string[]>>>>;
}

export function definePermissions<Permissions extends PermissionsDefinition>(
  definition: Permissions,
): Tagged<'permissions', Permissions> {
  return deepFreeze(tag('permissions', definition));
}

export interface SchemaDefinition {
  /** Table definitions in the shape the central schema file uses. */
  readonly tables: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

export function defineSchema<Schema extends SchemaDefinition>(
  definition: Schema,
): Tagged<'schema', Schema> {
  return deepFreeze(tag('schema', definition));
}

// --- the domain file --------------------------------------------------------

export interface DomainDefinition<Dependencies = unknown> {
  /**
   * Builds what the domain's service roots need from outside the domain. The
   * domain layer calls it once, before the first root starts, and passes the
   * result to every root's `create`.
   */
  readonly dependencies?: () => Dependencies | Promise<Dependencies>;
}

/** Declares the file boot reads for a domain. */
export function defineDomain<Dependencies>(
  definition: DomainDefinition<Dependencies> = {},
): Tagged<'domain', DomainDefinition<Dependencies>> {
  return tag('domain', { ...definition });
}
