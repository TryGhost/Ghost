/**
 * Opt-in query accounting, for performance investigations only.
 *
 * A CPU profile of the Pro image under load put mysql2 at 4.8% of busy time,
 * almost all of it in three places that scale with what Ghost sends and asks
 * for rather than with anything mysql2 does wrong: `MockBuffer` (measuring the
 * length of outgoing query text), `writeBuffer` (writing it), and
 * `ColumnDefinition`'s getters (once per column per result set). Answering
 * "which queries, how much text, how many columns" needs the query stream
 * itself, which nothing in Ghost records.
 *
 * This module attaches knex `query` / `query-response` listeners and keeps a
 * running total per normalised statement: how often it ran, how many bytes of
 * query text go out for it, and how many rows and columns come back. It is off
 * unless `GHOST_QUERY_STATS` is set, costs a Map lookup and a few additions per
 * query when it is on, and never holds on to a row.
 *
 * Snapshots go to stdout as single-line JSON prefixed with `ghost-query-stats`,
 * so a container log is enough to collect them - the benchmark harness already
 * keeps `docker logs` for the load lane. They are cumulative: every snapshot
 * covers everything since the last reset, and SIGUSR1 both prints a snapshot
 * and resets the counters, which is how a run confines the numbers to its load
 * window.
 *
 * Nothing here is meant to ship enabled. It is a measurement tool, and the
 * numbers it prints are the input to the fix, not the fix.
 */

const LOG_PREFIX = 'ghost-query-stats';

// Bytes a binding adds to the query text mysql2 writes. knex hands the driver
// `?` placeholders and mysql2's `query()` path interpolates them client-side
// (`SqlString.escape`), so the text on the wire is the statement with every
// placeholder replaced by its escaped value. These are the escaped lengths,
// close enough for volume accounting: the string case ignores the extra byte
// each escaped quote or backslash costs, which is noise outside of content
// that is mostly quotes.
function bindingBytes(value) {
  if (value === null || value === undefined) {
    return 4; // NULL
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 4 : 5; // true / false
    case 'number':
      return String(value).length;
    case 'bigint':
      return String(value).length;
    case 'string':
      return Buffer.byteLength(value) + 2; // quotes
    default:
      break;
  }

  if (value instanceof Date) {
    return 26; // '2024-01-01 00:00:00.000'
  }

  if (Buffer.isBuffer(value)) {
    return value.length * 2 + 3; // X'..' hex literal
  }

  if (Array.isArray(value)) {
    // mysql2 renders a nested array as a comma-separated list.
    let total = value.length > 0 ? value.length - 1 : 0;
    for (const item of value) {
      total += bindingBytes(item);
    }
    return total;
  }

  try {
    return Buffer.byteLength(JSON.stringify(value) ?? 'NULL');
  } catch {
    return 4;
  }
}

// Fold a statement down to its shape, so the same call site accumulates under
// one key however many bindings it happened to carry. The placeholder runs an
// `IN (...)` produces are what would otherwise scatter one relation load across
// hundreds of keys, so they collapse to `(?)` and the count they collapsed is
// recorded separately - a relation load whose `IN` list grows with the page is
// exactly what this is looking for.
function normalise(sql) {
  let placeholders = 0;

  const normalised = sql
    .replace(/\s+/g, ' ')
    .replace(/\((\s*\?\s*(?:,\s*\?\s*)+)\)/g, (match, list) => {
      // One key per shape; remember the widest list seen for the report.
      placeholders += (list.match(/\?/g) || []).length;
      return '(?)';
    })
    .trim();

  return {normalised, placeholders};
}

// How many raw statements the normalisation memo holds before it is dropped and
// refilled. knex emits placeholders rather than values, so one call site is
// normally one string and a few thousand covers everything a Ghost issues - but
// an `IN (...)` list is a different string at every length, and a filter can
// build shapes this has never seen, so the memo is capped rather than trusted
// to settle. Dropping it only costs the regex again; the totals live in
// `#byShape`, which is keyed by the normalised form and is genuinely bounded.
const MEMO_LIMIT = 5000;

class QueryStats {
  /** @type {Map<string, object>} keyed by normalised SQL */
  #byShape = new Map();

  /** @type {Map<string, object>} raw SQL text -> its entry, to skip re-normalising */
  #shapeOfSql = new Map();

  #queries = 0;
  #startedAt = Date.now();
  #memoLimit;

  /**
   * @param {object} [options]
   * @param {number} [options.memoLimit] statements the normalisation memo holds
   */
  constructor({memoLimit = MEMO_LIMIT} = {}) {
    this.#memoLimit = memoLimit;
  }

  #entryFor(sql) {
    const memoised = this.#shapeOfSql.get(sql);

    if (memoised) {
      return memoised;
    }

    const {normalised, placeholders} = normalise(sql);

    let entry = this.#byShape.get(normalised);

    if (!entry) {
      entry = {
        sql: normalised,
        count: 0,
        bytes: 0,
        rows: 0,
        columns: 0,
        responses: 0,
        max_list: 0,
      };
      this.#byShape.set(normalised, entry);
    }

    entry.max_list = Math.max(entry.max_list, placeholders);

    if (this.#shapeOfSql.size >= this.#memoLimit) {
      this.#shapeOfSql.clear();
    }

    this.#shapeOfSql.set(sql, entry);

    return entry;
  }

  #record(sql, bindings) {
    const entry = this.#entryFor(sql);

    let bytes = Buffer.byteLength(sql);

    if (bindings) {
      for (const binding of bindings) {
        // -1 for the `?` the value replaces.
        bytes += bindingBytes(binding) - 1;
      }
    }

    entry.count += 1;
    entry.bytes += bytes;
    this.#queries += 1;
  }

  #recordResponse(sql, response) {
    if (!Array.isArray(response)) {
      return;
    }

    const first = response[0];

    // Only a select comes back as an array of row objects; an insert or update
    // returns ids or affected-row counts, which have no columns to count.
    if (!first || typeof first !== 'object') {
      return;
    }

    // Looked up rather than carried from the `query` event: knex gives both
    // events the same statement, and going through the memo means a response
    // is still counted if the memo was dropped in between.
    const entry = this.#entryFor(sql);

    entry.responses += 1;
    entry.rows += response.length;
    entry.columns += Object.keys(first).length;
  }

  snapshot(reason) {
    const shapes = [...this.#byShape.values()]
      .map((entry) => ({
        sql: entry.sql,
        count: entry.count,
        bytes: entry.bytes,
        rows: entry.rows,
        // Columns are per result set, which is what a per-column cost such as
        // mysql2's ColumnDefinition getters scales with.
        avg_columns: entry.responses ? +(entry.columns / entry.responses).toFixed(2) : 0,
        max_list: entry.max_list,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    return {
      reason,
      at: new Date().toISOString(),
      window_ms: Date.now() - this.#startedAt,
      queries: this.#queries,
      shapes,
    };
  }

  reset() {
    this.#byShape.clear();
    this.#shapeOfSql.clear();
    this.#queries = 0;
    this.#startedAt = Date.now();
  }

  attach(knexInstance) {
    knexInstance.on('query', (query) => {
      if (query?.sql) {
        this.#record(query.sql, query.bindings);
      }
    });

    knexInstance.on('query-response', (response, query) => {
      if (query?.sql) {
        this.#recordResponse(query.sql, response);
      }
    });
  }
}

/**
 * @param {import('knex').Knex} knexInstance
 */
function enableQueryStats(knexInstance) {
  const stats = new QueryStats();

  stats.attach(knexInstance);

  const print = (reason) => {
    // Straight to stdout rather than through @tryghost/logging: this has to
    // survive whatever log level the run is configured with, and it is one
    // line so a log can be grepped for it.
    process.stdout.write(`${LOG_PREFIX} ${JSON.stringify(stats.snapshot(reason))}\n`);
  };

  // Cumulative snapshots on a timer, so a run that ends without a signal still
  // leaves usable totals in the log. Unref'd: this must not hold the process
  // open or show up as a handle that keeps an idle measurement awake.
  const intervalSeconds = Number(process.env.GHOST_QUERY_STATS_INTERVAL || 30);

  if (intervalSeconds > 0) {
    setInterval(() => print('interval'), intervalSeconds * 1000).unref();
  }

  // SIGUSR1 prints and resets, which is how a benchmark run brackets its load
  // window: one signal before the load to discard boot and idle traffic, one
  // after to print the window. Node reserves SIGUSR1 for starting the
  // inspector and keeps doing that alongside this listener, so a signalled
  // process also logs "Debugger listening on ws://..." - noise, nothing
  // connects to it, and the benchmark's profile lane already lives with it.
  process.on('SIGUSR1', () => {
    print('signal');
    stats.reset();
  });

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => print(signal.toLowerCase()));
  }

  return stats;
}

module.exports = {
  QueryStats,
  enableQueryStats,
  normalise,
  bindingBytes,
  LOG_PREFIX,
};
