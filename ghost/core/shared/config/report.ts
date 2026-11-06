import type { z } from 'zod';

type Issues = readonly z.core.$ZodIssue[];
type KeyPath = readonly PropertyKey[];

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

/** Report a config validation failure: throw when strict, otherwise log. */
export function reportInvalid(
  issues: Issues,
  { strict, env }: { strict: boolean; env: string },
): void {
  const report = formatIssues(issues);

  if (strict) {
    // new Error is allowed here, as we do not want config to depend on @tryghost/error
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(`Ghost config failed validation:\n${report}`);
  }

  // eslint-disable-next-line no-console
  console.error(
    `Ghost config failed validation (not enforced in the ${env} environment):\n${report}`,
  );
}

/**
 * Report keys a section marked `unknownKeys: 'warn'` does not name. Ghost
 * strips and never reads them, so outside strict this is only a warning.
 */
export function reportUnknownKeys(
  paths: readonly KeyPath[],
  { strict }: { strict: boolean },
): void {
  if (!paths.length) {
    return;
  }

  const report = paths.map((path) => `  ${path.map(String).join(':')}`).join('\n');

  if (strict) {
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error(`Ghost config has unknown keys:\n${report}`);
  }

  // eslint-disable-next-line no-console
  console.warn(`Ghost config has unknown keys, which are ignored:\n${report}`);
}
