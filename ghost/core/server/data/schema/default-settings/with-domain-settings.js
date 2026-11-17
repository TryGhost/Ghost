const { domainSettingGroups } = require('../../../../../bootstrap/domains/fragments');

/**
 * A domain declares the settings it owns in its settings.ts. This merges them
 * into the settings stored in a default-settings JSON file, so callers still
 * get every default setting.
 *
 * A group the JSON file names keeps its place, which keeps the order settings
 * are listed and hashed in. A group only a domain names is added at the end.
 *
 * @param {Record<string, Record<string, unknown>>} stored
 * @returns {Record<string, Record<string, unknown>>}
 */
module.exports = function withDomainSettings(stored) {
  const fromDomains = domainSettingGroups();
  const defaultSettings = {};
  for (const group of new Set([...Object.keys(stored), ...Object.keys(fromDomains)])) {
    defaultSettings[group] = { ...stored[group], ...fromDomains[group] };
  }
  return defaultSettings;
};
