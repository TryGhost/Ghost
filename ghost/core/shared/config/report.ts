import * as report from '../../foundry/config/report';

// How validation failures are reported is the framework's. Ghost names its config.
const name = 'Ghost config';

export const formatIssues = report.formatIssues;

/** Report a config validation failure: throw when strict, otherwise log. */
export function reportInvalid(
  issues: Parameters<typeof report.reportInvalid>[0],
  options: { strict: boolean; env: string },
): void {
  report.reportInvalid(issues, { ...options, name });
}

/** Warn about keys a closed section does not name. Never throws. */
export function reportUnknownKeys(paths: readonly (readonly PropertyKey[])[]): void {
  report.reportUnknownKeys(paths, name);
}
