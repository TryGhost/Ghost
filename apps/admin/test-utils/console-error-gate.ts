import { afterEach } from 'vitest';

/**
 * Fails a test that logs an unexpected console.error. React's dev warnings,
 * error boundaries and the app's own error logging all land there, so a new
 * one means something broke even when the assertions still pass.
 *
 * A test that expects an error either silences it
 * (`vi.spyOn(console, 'error').mockImplementation(() => {})`, which skips this
 * gate) or declares it with `allowConsoleError(pattern)`.
 */

type Pattern = string | RegExp;
/** Recognizes a console.error call by its raw arguments rather than its text. */
type CallMatcher = (args: unknown[]) => boolean;

interface Call {
  args: unknown[];
  message: string;
}

const GATE = Symbol.for('ghost-admin.console-error-gate');

let recorded: Call[] = [];
let allowedThisTest: Pattern[] = [];

const matches = (message: string, pattern: Pattern) =>
  typeof pattern === 'string' ? message.includes(pattern) : pattern.test(message);

const describeArg = (arg: unknown): string => {
  if (arg instanceof Error) {
    return arg.stack ?? `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === 'string') {
    return arg;
  }
  // Vitest logs an unhandled rejection this way when the page listens for them too.
  if (typeof PromiseRejectionEvent !== 'undefined' && arg instanceof PromiseRejectionEvent) {
    return `Unhandled rejection: ${describeArg(arg.reason)}`;
  }
  try {
    return JSON.stringify(arg) ?? String(arg);
  } catch {
    return String(arg);
  }
};

// Applies printf-style substitutions the way the console does, since React
// logs its warnings as a format string plus arguments.
const formatConsoleArgs = (args: unknown[]): string => {
  const [first, ...rest] = args;
  if (typeof first !== 'string') {
    return args.map(describeArg).join(' ');
  }
  const remaining = [...rest];
  const formatted = first.replace(/%[sdifoOc%]/g, (token) => {
    if (token === '%%') {
      return '%';
    }
    if (remaining.length === 0) {
      return token;
    }
    const value = remaining.shift();
    return token === '%c' ? '' : describeArg(value);
  });
  return [formatted, ...remaining.map(describeArg)].join(' ');
};

/** Lets the current test log a console.error matching `pattern`; resets after each test. */
export function allowConsoleError(pattern: Pattern): void {
  allowedThisTest.push(pattern);
}

/**
 * Wraps console.error to record each call, and fails the test in afterEach if
 * any call matched neither `expected` nor the test's `allowConsoleError`
 * patterns. Call once from a setup file.
 */
export function installConsoleErrorGate(expected: readonly (Pattern | CallMatcher)[] = []): void {
  /* eslint-disable no-console -- the gate wraps console.error itself */
  const current = console.error as typeof console.error & { [GATE]?: true };
  if (!current[GATE]) {
    const original = current;
    const gated = (...args: unknown[]) => {
      recorded.push({ args, message: formatConsoleArgs(args) });
      original.apply(console, args);
    };
    console.error = Object.assign(gated, { [GATE]: true as const });
  }
  /* eslint-enable no-console */

  afterEach(() => {
    const unexpected = recorded
      .filter(
        ({ args, message }) =>
          !expected.some((matcher) =>
            typeof matcher === 'function' ? matcher(args) : matches(message, matcher),
          ) && !allowedThisTest.some((pattern) => matches(message, pattern)),
      )
      .map(({ message }) => message);
    recorded = [];
    allowedThisTest = [];

    if (unexpected.length > 0) {
      throw new Error(
        [
          'Unexpected console.error during this test:',
          ...unexpected.map((message) => `  - ${message.split('\n').join('\n    ')}`),
          '',
          'Fix the cause, or call allowConsoleError(pattern) in the test if the error is expected.',
        ].join('\n'),
      );
    }
  });
}
