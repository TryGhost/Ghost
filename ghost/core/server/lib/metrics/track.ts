import { IncorrectUsageError } from '@tryghost/errors';
import type { z } from 'zod';

/** Fields an attempt's document carries, or `@tryghost/metrics` adds to it, that no tag may take. */
type ReservedField =
  | 'event'
  | 'outcome'
  | 'duration_ms'
  | 'error'
  | '@timestamp'
  | 'metadata'
  | 'sampleRate'
  | 'value';

/**
 * The tags an attempt can carry. Each is a small enum, so a tag can never hold a name, an email
 * address or anything else free-form.
 */
export type TagShape = { [tag: string]: z.ZodEnum } & { [Field in ReservedField]?: never };

/** The tags an attempt has been given so far. */
export type Tags<Shape extends TagShape> = { [Tag in keyof Shape]?: z.output<Shape[Tag]> };

/**
 * An operation whose every attempt is recorded once, as one document saying whether it
 * succeeded and carrying the tags the attempt was given.
 */
export interface TrackDefinition<
  Name extends string,
  Shape extends TagShape,
  Event extends string,
> {
  /** The attempt's `event.name`: dotted, lowercase words, such as `stripe_checkout.session`. */
  readonly name: Name;
  /**
   * The `@tryghost/metrics` metric the attempts are shipped as, and so the `metrics-<metric>`
   * data stream they land in: the name with its dots and underscores as hyphens.
   */
  readonly metric: string;
  readonly tags: z.ZodObject<Shape>;
  /** What an attempt can log, each as `<name>.<event>`. */
  readonly events: readonly Event[];
}

/** Lowercase words joined by dots, which also makes a valid Elasticsearch data stream name. */
const TRACK_NAME = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

/** Declares an operation to track, next to the domain that performs it. */
export function defineTrack<
  const Name extends string,
  Shape extends TagShape,
  const Event extends string = never,
>(definition: {
  name: Name;
  tags: z.ZodObject<Shape>;
  events?: readonly Event[];
}): TrackDefinition<Name, Shape, Event> {
  if (!TRACK_NAME.test(definition.name)) {
    throw new IncorrectUsageError({
      message: `A tracked operation's name must be lowercase words joined by dots, got "${definition.name}".`,
    });
  }
  return {
    name: definition.name,
    metric: definition.name.replace(/[._]/g, '-'),
    tags: definition.tags,
    events: definition.events ?? [],
  };
}

/** What an attempt can log. Each line is attributed to the operation and carries its tags. */
export interface AttemptLog<Event extends string> {
  /** Logs an error as `<name>.<event>`, with the attempt's tags and these fields. */
  error(event: Event, fields: Record<string, unknown>, message: string): void;
}

/** One attempt at a tracked operation, as the operation sees it while it runs. */
export interface Attempt<Shape extends TagShape, Event extends string> {
  /**
   * Tags the attempt, replacing any value the tag had. A value that isn't one of the tag's own
   * is logged and leaves the tag unset, rather than failing the operation.
   */
  tag<Tag extends keyof Shape & string>(tag: Tag, value: z.output<Shape[Tag]>): void;
  readonly log: AttemptLog<Event>;
}

/** Records tracked operations. Recording never changes what an operation returns or throws. */
export interface Metrics {
  /**
   * Runs `fn` and returns its result or rethrows its error unchanged, recording one attempt
   * once it settles: `success` or `failure`, the tags it was given, how long it took, and on a
   * failure what kind of error it was.
   */
  track<Name extends string, Shape extends TagShape, Event extends string, Result>(
    definition: TrackDefinition<Name, Shape, Event>,
    fn: (attempt: Attempt<Shape, Event>) => Promise<Result>,
  ): Promise<Result>;
  track<Name extends string, Shape extends TagShape, Event extends string, Result>(
    definition: TrackDefinition<Name, Shape, Event>,
    fn: (attempt: Attempt<Shape, Event>) => Result,
  ): Result;
}
