/**
 * What an attribute can hold: the values OpenTelemetry's attributes take, except that a list
 * can't hold `null` or `undefined`, which OpenTelemetry allows so a list can keep the place of a
 * missing value and no span here needs.
 */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Must stay a subset of OpenTelemetry's `Span`, so that an OpenTelemetry span can be passed in
 * its place.
 */
export interface Span {
  /** Setting a key that is already set replaces its value. */
  setAttribute(key: string, value: AttributeValue): void;
}

/**
 * Follows OpenTelemetry's tracing API, so that OpenTelemetry can replace it without changing the
 * operations it traces. It differs only where that makes tracing simpler or safer:
 *
 * - `track` ends the span and sets its status itself: success when the operation returns, and
 *   failure when it throws. OpenTelemetry leaves both to the operation, so each operation would
 *   repeat the same `try`, `catch` and `finally`.
 * - For the same reason, `track` records a failure's exception itself, which OpenTelemetry also
 *   leaves to the operation.
 * - The exception is in Ghost's `err` field, not OpenTelemetry's `exception.*` attributes, as
 *   that is where Ghost's logs keep errors.
 *
 * As OpenTelemetry's conventions for exceptions in logs describe, the exception is a log line of
 * its own, named `<name>.exception`, with the span's trace and span ids and its attributes. The
 * span keeps only the error's type, because error messages can hold personal data such as a
 * buyer's email address, and spans are kept as metrics, far longer than logs.
 *
 * It also lacks two things OpenTelemetry has. An error the operation expects, such as a buyer
 * mistyping their email address, can't be marked as anything but a failure, so its exception is
 * logged as an error, like any other exception that leaves its span. And a span started
 * inside another isn't linked to it as its child, so each span is a trace of its own.
 */
export interface Tracer {
  /**
   * Runs `fn` and returns its result or rethrows its error unchanged, whether or not recording
   * its span succeeds.
   *
   * Dashboards and alerts find spans by `name`, so it names the operation in the domain's terms,
   * the way Ghost names log events, such as `stripe_checkout.session`. A name taken from the
   * code that runs the operation would change whenever that code is refactored.
   */
  track<Result>(name: string, fn: (span: Span) => Promise<Result>): Promise<Result>;
}
