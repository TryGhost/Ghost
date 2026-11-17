import type { z } from 'zod';

type Issues = readonly z.core.$ZodIssue[];

/**
 * One line per issue, each naming its nconf key path, e.g.
 * `paths:migrationPath: Invalid input: expected string, received undefined`.
 */
export function formatIssues(issues: Issues): string {
  return issues
    .map((issue) =>
      issue.path.length
        ? `  ${issue.path.map(String).join(':')}: ${issue.message}`
        : `  ${issue.message}`,
    )
    .join('\n');
}

/**
 * Report a config validation failure: throw when strict, otherwise log.
 *
 * @param options.name - What the config is called in the message, such as "Ghost config".
 */
export function reportInvalid(
  issues: Issues,
  { strict, env, name = 'Config' }: { strict: boolean; env: string; name?: string },
): void {
  const report = formatIssues(issues);

  if (strict) {
    // new Error is allowed here, as config must not depend on @tryghost/errors
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(`${name} failed validation:\n${report}`);
  }

  // eslint-disable-next-line no-console
  console.error(`${name} failed validation (not enforced in the ${env} environment):\n${report}`);
}

/**
 * Warn about keys a closed section does not name. They are stripped and never
 * read, so this never throws.
 */
export function reportUnknownKeys(
  paths: readonly (readonly PropertyKey[])[],
  name = 'Config',
): void {
  if (!paths.length) {
    return;
  }

  const report = paths.map((path) => `  ${path.map(String).join(':')}`).join('\n');

  // eslint-disable-next-line no-console
  console.warn(`${name} has unknown keys, which are ignored:\n${report}`);
}
