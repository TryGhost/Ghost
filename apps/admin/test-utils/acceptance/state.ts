import type { Config } from '@tryghost/admin-x-framework/api/config';
import {
  configResponse,
  currentUserResponse,
  settingsResponse,
  staffRole,
  type Setting,
  type SettingValue,
  type StaffRoleName,
  type StaffUser,
} from '@tryghost/test-data';

export type UserOverrides = Partial<Omit<StaffUser, 'roles' | 'accessibility'>> & {
  roles?: StaffRoleName[];
  accessibility?: Record<string, unknown> | null;
};

export interface AdminScenarioOptions {
  /** Flags are represented in both settings and config. */
  labs?: Record<string, boolean>;
  /** Per-key values; null is a value, not an absent setting. Use omitSettings for absence. */
  settings?: Record<string, SettingValue>;
  /** Capabilities missing from an older backend. */
  omitSettings?: readonly string[];
  /** Known config fields; nested objects replace rather than deep-merge. */
  config?: Partial<Config> & { labs?: never };
  /** Per-limit replacements, preserving other limits and host settings. */
  limits?: NonNullable<Config['hostSettings']>['limits'];
  user?: UserOverrides;
}

/** Pure seed construction, separate from MSW registration and the test lifecycle. */
export function createAdminState(options: AdminScenarioOptions = {}) {
  if (options.settings && Object.hasOwn(options.settings, 'labs')) {
    throw new Error('Use the labs option instead of settings.labs.');
  }
  if (options.config && Object.hasOwn(options.config, 'labs')) {
    throw new Error('Use the labs option instead of config.labs.');
  }
  if (options.omitSettings?.includes('labs')) {
    throw new Error(
      'Use a raw boot response to omit labs; omitSettings preserves labs composition.',
    );
  }
  for (const key of options.omitSettings ?? []) {
    if (options.settings && Object.hasOwn(options.settings, key)) {
      throw new Error(`Setting "${key}" cannot be supplied in both settings and omitSettings.`);
    }
  }
  if (options.limits && options.config?.hostSettings?.limits !== undefined) {
    throw new Error('Supply limits or config.hostSettings.limits, not both.');
  }

  const settings = settingsResponse({ labs: options.labs, settings: options.settings });
  settings.settings = settings.settings.filter(({ key }) => !options.omitSettings?.includes(key));

  const config = configResponse({ labs: options.labs });
  Object.assign(config.config, structuredClone(options.config ?? {}));
  if (options.limits) {
    const hostSettings = config.config.hostSettings as Config['hostSettings'];
    config.config.hostSettings = {
      ...hostSettings,
      limits: { ...hostSettings?.limits, ...structuredClone(options.limits) },
    };
  }

  const user = currentUserResponse();
  const { roles, accessibility, ...fields } = options.user ?? {};
  Object.assign(user.users[0], structuredClone(fields));
  if (roles !== undefined) {
    user.users[0].roles = roles.map((name) =>
      staffRole({
        name,
        description: name === 'Owner' ? 'Blog Owner' : `${name}s`,
      }),
    );
  }
  if (accessibility !== undefined) {
    user.users[0].accessibility = accessibility === null ? null : JSON.stringify(accessibility);
  }

  return {
    readSettings: () => structuredClone(settings),
    readConfig: () => structuredClone(config),
    readUser: () => structuredClone(user),
    isCurrentUser: (id: string) => id === user.users[0].id,
    editSettings(edits: Setting[]) {
      // Parse before committing so a malformed labs write cannot partially update the world.
      const labsEdit = edits.find(({ key }) => key === 'labs');
      const labs: unknown = labsEdit ? JSON.parse(String(labsEdit.value)) : undefined;
      if (labsEdit && (typeof labs !== 'object' || labs === null || Array.isArray(labs))) {
        throw new Error('A labs setting must contain a JSON object.');
      }
      const byKey = new Map(settings.settings.map((setting) => [setting.key, setting]));
      for (const edit of edits) {
        byKey.set(edit.key, { ...byKey.get(edit.key), ...structuredClone(edit) });
      }
      settings.settings = [...byKey.values()];
      if (labsEdit) {
        config.config.labs = labs as Record<string, boolean>;
      }
      return structuredClone(settings);
    },
    editUser(edits: Record<string, unknown>, commit = true) {
      const updated = { ...user.users[0], ...structuredClone(edits), id: user.users[0].id };
      if (commit) {
        user.users[0] = updated;
      }
      return { users: [structuredClone(updated)] };
    },
  };
}
