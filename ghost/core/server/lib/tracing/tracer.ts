/**
 * The values a span attribute can hold. These are the values OpenTelemetry's attributes take,
 * minus one: OpenTelemetry also lets a list hold `null` or `undefined`, to keep the place of a
 * missing value, and no span in Ghost needs that.
 */
export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * This interface must stay a subset of OpenTelemetry's `Span`, so that an OpenTelemetry span can
 * be passed wherever this one is expected.
 */
export interface Span {
  /** Setting a key that is already set replaces its value. */
  setAttribute(key: string, value: AttributeValue): void;
}

/**
 * Ghost's tracer follows OpenTelemetry's tracing API, so that OpenTelemetry can replace it
 * without changing the code that is traced. It differs from OpenTelemetry's API only where that
 * makes tracing simpler or safer:
 *
 * - `track` ends the span and sets the span's status itself: success when the traced operation
 *   returns, and failure when the operation throws. OpenTelemetry leaves both to the operation,
 *   so every traced operation would repeat the same `try`, `catch` and `finally`.
 * - For the same reason, `track` records the exception of a failed operation itself, which
 *   OpenTelemetry also leaves to the operation.
 * - The exception goes in the log line's `err` field, where Ghost's logs keep errors, rather
 *   than in OpenTelemetry's `exception.*` attributes.
 *
 * Following OpenTelemetry's conventions for exceptions in logs, the exception is logged as a line
 * of its own, named `<span name>.exception`, carrying the span's trace id, span id and
 * attributes. The span itself keeps only the error's type, never its message, because error
 * messages can hold personal data such as a buyer's email address, and spans are kept as
 * metrics, far longer than logs.
 *
 * Ghost's tracer also lacks two things OpenTelemetry has:
 *
 * - An operation can't mark an error as expected, such as a buyer mistyping their email address.
 *   Every error that leaves a span fails the span, and the error is logged as an exception.
 * - A span started while another span is running isn't linked to the running span as its child,
 *   so each span is a trace of its own.
 */
export interface Tracer {
  /**
   * Runs `fn` inside a new span, and returns what `fn` returns or rethrows what `fn` throws,
   * unchanged. A failure to record the span never changes what `track` returns or throws.
   *
   * Dashboards and alerts find spans by `name`, so `name` should describe the operation in the
   * domain's terms, the way Ghost names log events, such as `stripe_checkout.session`. A name
   * taken from the code that runs the operation, such as a function's name, would change whenever
   * that code is refactored, and the dashboards and alerts would stop finding the span.
   */
  track<Result>(name: string, fn: (span: Span) => Promise<Result>): Promise<Result>;
}
