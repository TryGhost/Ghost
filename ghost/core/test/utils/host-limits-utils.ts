// Loaded with `require`, deliberately. Ghost's server is CommonJS, and this runner gives a
// module a separate instance per loading style: `import`ing these would hand this file a
// second limit service and a second config, and configuring those would leave the ones
// serving the requests under test untouched. The annotations are the types of the real
// modules, so what is reached for here is still checked.
/** `config-utils` is JavaScript with no types of its own, so state what is used of it. */
interface ConfigUtils {
  set(config: Record<string, unknown>): void;
  restore(): Promise<void>;
}

const config: typeof import('../../core/shared/config') = require('../../core/shared/config');
const configUtils: ConfigUtils = require('./config-utils');
const limits: typeof import('../../core/server/services/limits') = require('../../core/server/services/limits');
const {
  fromHostSettings,
}: typeof import('../../core/server/services/limits/host-settings') = require('../../core/server/services/limits/host-settings');

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
 * thing that is not obvious is that the limit service reads that configuration once, during
 * boot, so a test changing it afterwards has to ask the service to read it again. That is
 * what this hides.
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
  limits.init(fromHostSettings(config));
}

/** Put the site back to having no limits, and the limit service back in step with that. */
export async function restoreHostLimits(): Promise<void> {
  await configUtils.restore();
  limits.init(fromHostSettings(config));
}
