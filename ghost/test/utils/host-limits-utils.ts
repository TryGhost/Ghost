// Required, not imported, so that these are the root and the application Ghost's own code asks:
// see ./services.ts.
const limits: typeof import('../../shared/limits').default = require('../../shared/limits').default;
const application: typeof import('../../bootstrap/app').default =
  require('../../bootstrap/app').default;

// Config utils is CommonJS with no types of its own, so state its shape here.
interface ConfigUtils {
  set(config: Record<string, unknown>): void;
  restore(): Promise<void>;
}

const configUtils = require('./config-utils') as ConfigUtils;

/** One limit as a host configures it: a value, never a function. */
export interface HostLimitConfig {
  // Strings, because that is what a host sends. Ghost(Pro) keeps every limit value in one
  // string column and hands it over untouched, so a maximum arrives as '5' and a flag as
  // 'true'. Typing these as the booleans and numbers they read like would let a test pass
  // against a shape no site is ever configured with.
  max?: number | string;
  maxPeriodic?: number | string;
  allowlist?: string[];
  disabled?: boolean | string;
  error?: string;
}

/** The rest of hostSettings a limit might need, such as billing links or a period anchor. */
export interface HostSettings {
  billing?: { enabled?: boolean; url?: string };
  subscription?: { start?: string };
}

/**
 * Limit a site the way its host does, for the duration of a test.
 *
 * Limits are host configuration, so configuration is all a test should have to set. The one
 * thing that is not obvious is that the limit service reads that configuration once, when it is
 * built on first use during boot, so a test changing it afterwards has to ask the service to read
 * it again. That is what this hides. While Ghost is not started there is no limit service: the
 * next start builds one from the configuration set here.
 *
 * Reach for this rather than stubbing the limit service. A stub asserts that Ghost called
 * something, which stays true however the limits are implemented underneath, including when
 * they are not implemented at all.
 *
 *   await setHostLimits({staff: {max: 1}});
 *   await setHostLimits({limitAnalytics: {disabled: true}}, {billing: {enabled: true, url}});
 *
 * Pair with `restoreHostLimits()` in an afterEach.
 */
export async function setHostLimits(
  limitsConfig: Record<string, HostLimitConfig>,
  rest: HostSettings = {},
): Promise<void> {
  configUtils.set({ hostSettings: { ...rest, limits: limitsConfig } });
  reloadHostLimits();
}

/** Put the site back to having no limits, and the limit service back in step with that. */
export async function restoreHostLimits(): Promise<void> {
  await configUtils.restore();
  reloadHostLimits();
}

/**
 * Asks the limit service Ghost holds to read its configuration again, for a test that sets
 * `hostSettings` in config itself. After Ghost has stopped there is none to ask, and the next
 * start reads the configuration as it is then.
 */
export function reloadHostLimits(): void {
  if (application.services.isOpen) {
    limits.extras.load(limits.service, application.foundation);
  }
}
