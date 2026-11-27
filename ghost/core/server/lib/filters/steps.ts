import errors from '@tryghost/errors';
import { expandFilters } from '@tryghost/mongo-utils';
import type { Knex } from 'knex';
import { expandAllFilters } from './nql-utils';
import { type ParsedFilter, isParsedFilter, parseFilter, unreadableFilter } from './parse';

/** Rewrites a parsed filter, as NQL's `mongoTransformer` option takes it. */
export type FilterTransformer = (filter: unknown) => unknown;

/** What a step reads besides the filter, from the query the filter is for. */
export interface FilterContext {
  /** The transaction the query runs in, when it runs in one. A step that reads the database reads in it. */
  readonly transacting?: Knex.Transaction;
}

/**
 * One rewrite of a parsed filter, such as putting a saved segment's filter in place of its name or
 * mapping a key that isn't a column onto one that is. A step returns the rewritten filter and
 * throws to reject the filter. A step that doesn't read the database ignores the context.
 */
export type FilterStep = (
  filter: ParsedFilter,
  context: FilterContext,
) => ParsedFilter | Promise<ParsedFilter>;

/**
 * Runs `rewrite` on `filter`, reporting anything it throws as `unreadableFilter`, as NQL reports a
 * failure after parsing.
 */
function rewritten(
  rewrite: (filter: ParsedFilter) => ParsedFilter,
  filter: ParsedFilter,
): ParsedFilter {
  try {
    return rewrite(filter);
  } catch (err) {
    throw unreadableFilter(err);
  }
}

/**
 * Applies `transformer` to `filter`. A transformer comes from outside this library and can return
 * anything, so a result that isn't a parsed filter is reported as `unreadableFilter`, as is
 * anything the transformer throws.
 */
function transform(transformer: FilterTransformer, filter: ParsedFilter): ParsedFilter {
  let transformed: unknown;
  try {
    transformed = transformer(filter);
  } catch (err) {
    throw unreadableFilter(err);
  }
  if (!isParsedFilter(transformed)) {
    throw unreadableFilter(
      new errors.IncorrectUsageError({
        message: 'A filter transformer returned something other than a filter.',
      }),
    );
  }
  return transformed;
}

/** A step that applies `transformer`, a rewrite in the form NQL's `mongoTransformer` option takes. */
export function transformerStep(transformer: FilterTransformer): FilterStep {
  return (filter) => transform(transformer, filter);
}

/**
 * The step that applies the caller's own rewrite, such as the Admin API's check for restricted
 * fields. When the caller has none, the step returns the filter it is given.
 */
export function callerTransformerStep(transformer: FilterTransformer | undefined): FilterStep {
  return transformer ? transformerStep(transformer) : (filter) => filter;
}

/**
 * A step that renames each key `renames` names to the key it stands for, such as `label` to
 * `labels.slug`, wherever the key is used. A key that only renames another gives the same filter
 * whether its `$all` is expanded before or after the rename, so the query stage expands it.
 */
export function renameStep(renames: Readonly<Record<string, string>>): FilterStep {
  const expansions = Object.entries(renames).map(([key, replacement]) => ({ key, replacement }));
  return (filter) => rewritten((parsed) => expandFilters(parsed, expansions), filter);
}

/** A filter key that stands for another key together with a condition. */
export interface KeyWithCondition {
  /** The key a filter uses, such as `opened_emails.post_id`. */
  readonly key: string;
  /** The key it stands for, such as `emails.post_id`. */
  readonly replacement: string;
  /**
   * Filter text for the condition each statement on the key carries, such as
   * `email_recipients.opened_at:>=0`. It is parsed once, when the step is built.
   */
  readonly condition: string;
}

/**
 * A step that replaces each statement on `key` with the same statement on `replacement`, grouped
 * with `condition`. Each value of an `$all` on the key, as in `key:[a+b]`, gets its own group with
 * its own copy of the condition, so `opened_emails.post_id:[a+b]` matches members who opened both
 * emails, not members who received both and opened one. Every other statement on the key becomes
 * what `@tryghost/nql` makes of a key with an expansion.
 */
export function keyWithConditionStep({
  key,
  replacement,
  condition,
}: KeyWithCondition): FilterStep {
  const expansions = [{ key, replacement, expansion: parseFilter(condition) }];
  const expandsKey = (name: string) => name === key;
  return (filter) =>
    rewritten((parsed) => expandFilters(expandAllFilters(parsed, expandsKey), expansions), filter);
}
