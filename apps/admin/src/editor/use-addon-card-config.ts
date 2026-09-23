import { useEffect, useMemo, useState } from 'react';
import {
  ADDONS_SETTING_KEY,
  createAddonEditorBlocksConfig,
  parseInstallRecords,
  refreshInstallRecords,
  type AddonInstallRecord,
} from '@tryghost/addon-kit/host';
import { getSettingValue, type Setting } from '@tryghost/admin-x-framework/api/settings';

/** Uses the editor's existing settings read; never starts an Admin request or save. */
export function useAddonCardConfig(
  settings: Setting[] | null,
  enabled: boolean,
  siteTimezone: string,
) {
  // The flag can reach an older backend before its supporting setting does.
  const value = enabled ? getSettingValue(settings, ADDONS_SETTING_KEY) : undefined;
  const raw = typeof value === 'string' ? value : null;
  const [resolved, setResolved] = useState<{ raw: string; installs: AddonInstallRecord[] } | null>(
    null,
  );

  useEffect(() => {
    if (raw === null) {
      return;
    }
    let cancelled = false;
    void refreshInstallRecords(parseInstallRecords(raw)).then((installs) => {
      if (!cancelled) {
        setResolved({ raw, installs });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  return useMemo(
    () =>
      raw !== null && resolved?.raw === raw
        ? createAddonEditorBlocksConfig(resolved.installs, undefined, { siteTimezone })
        : undefined,
    [raw, resolved, siteTimezone],
  );
}
