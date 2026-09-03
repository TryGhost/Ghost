// Both of these are CommonJS with no types of their own, so the shape this file relies on
// is stated here rather than inferred as `any`.
interface ConfigUtils {
  set(config: Record<string, unknown>): void;
  restore(): Promise<void>;
}

interface LimitService {
  init(): void;
}

const configUtils = require('./config-utils') as ConfigUtils;
const limits = require('../../core/server/services/limits') as LimitService;

/** One limit as a host configures it: a value, never a function. */
export interface HostLimitConfig {
  max?: number;
  maxPeriodic?: number;
  allowlist?: string[];
  disabled?: boolean;
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
  await limits.init();
}

/** Put the site back to having no limits, and the limit service back in step with that. */
export async function restoreHostLimits(): Promise<void> {
  await configUtils.restore();
  await limits.init();
}
