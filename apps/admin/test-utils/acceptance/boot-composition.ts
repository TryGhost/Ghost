import { configResponse, settingsResponse } from '@tryghost/test-data';

import type { BootOverrides, BootRequestName } from './boot';

type LabsFlags = Record<string, boolean>;
type BootOverride = NonNullable<BootOverrides[BootRequestName]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLabsSettingValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Unrecognized bodies (error envelopes, non-objects) pass through untouched;
// recognized ones are clone-and-merged — never mutate a test-owned object.
function mergeLabsIntoConfigBody(body: unknown, labs: LabsFlags): unknown {
  if (!isRecord(body) || !isRecord(body.config)) {
    return body;
  }
  const existing = isRecord(body.config.labs) ? body.config.labs : {};
  return { ...body, config: { ...body.config, labs: { ...existing, ...labs } } };
}

function mergeLabsIntoSettingsBody(body: unknown, labs: LabsFlags): unknown {
  if (!isRecord(body) || !Array.isArray(body.settings)) {
    return body;
  }
  let found = false;
  const settings = body.settings.map((entry: unknown) => {
    if (!isRecord(entry) || entry.key !== 'labs') {
      return entry;
    }
    found = true;
    return { ...entry, value: JSON.stringify({ ...parseLabsSettingValue(entry.value), ...labs }) };
  });
  if (!found) {
    settings.push(...settingsResponse({ labs }).settings.filter(({ key }) => key === 'labs'));
  }
  return { ...body, settings };
}

function mergeConfigFields(body: unknown, fields: Record<string, unknown>): unknown {
  if (!isRecord(body) || !isRecord(body.config)) {
    return body;
  }
  return { ...body, config: { ...body.config, ...fields } };
}

function withMergedResponse(
  override: BootOverride,
  merge: (body: unknown) => unknown,
  fallback: () => unknown,
): BootOverride {
  const { response } = override;
  if (response === undefined) {
    return { ...override, response: fallback() };
  }
  if (typeof response === 'function') {
    return {
      ...override,
      response: async (request: Request) =>
        merge(await (response as (request: Request) => unknown)(request)),
    };
  }
  return { ...override, response: merge(response) };
}

/**
 * The `labs` render option compiled onto the boot overrides: `browseConfig`/
 * `browseSettings` overrides get the flags merged into their responses
 * (flags named in `labs` win); absent entries get the canned test-data
 * responses with the flags applied.
 */
export function composeLabsBootOverrides(labs: LabsFlags, boot: BootOverrides = {}): BootOverrides {
  return {
    ...boot,
    browseConfig: withMergedResponse(
      boot.browseConfig ?? {},
      (body) => mergeLabsIntoConfigBody(body, labs),
      () => configResponse({ labs }),
    ),
    browseSettings: withMergedResponse(
      boot.browseSettings ?? {},
      (body) => mergeLabsIntoSettingsBody(body, labs),
      () => settingsResponse({ labs }),
    ),
  };
}

/**
 * Extra `/config/` fields compiled onto the boot overrides, the way `labs`
 * flags are: merged into a `browseConfig` override response if the test has
 * one, otherwise onto the canned test-data response. As with
 * `composeLabsBootOverrides`, the fields named here win over the same key in a
 * spec's own `browseConfig` response.
 */
export function composeConfigBootOverrides(
  fields: Record<string, unknown>,
  boot: BootOverrides = {},
): BootOverrides {
  return {
    ...boot,
    browseConfig: withMergedResponse(
      boot.browseConfig ?? {},
      (body) => mergeConfigFields(body, fields),
      () => mergeConfigFields(configResponse(), fields),
    ),
  };
}
