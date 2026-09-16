import { visibleThemeCustomSettings } from './theme-loader';
import { cloneThemeDraft, withThemeRevision } from './theme-state';

import type { BuilderToolResult } from '@/builder/core/tool-types';
import type { ThemeCandidateResult } from './theme-tools';
import type { ThemeCustomSetting, ThemeDraft, ThemeGlobalSettings } from './theme-state';

type SettingValue = string | boolean | null;
type ToolFailure = Extract<BuilderToolResult<never>, { ok: false }>;

export type DesignSettingDescriptor = {
  identifier: string;
  type: ThemeCustomSetting['type'];
  currentValue: SettingValue;
  stagedValue: SettingValue;
  writable: boolean;
  choices?: string[];
  description?: string;
};

const globalSettings: Array<{
  key: keyof ThemeGlobalSettings;
  type: 'color' | 'text' | 'image';
  writable: boolean;
}> = [
  { key: 'accent_color', type: 'color', writable: true },
  { key: 'heading_font', type: 'text', writable: true },
  { key: 'body_font', type: 'text', writable: true },
  { key: 'icon', type: 'image', writable: false },
  { key: 'logo', type: 'image', writable: false },
  { key: 'cover_image', type: 'image', writable: false },
];

function failure(
  draft: ThemeDraft,
  code: string,
  message: string,
  retryable = false,
  details?: unknown,
): ToolFailure {
  return {
    ok: false,
    revision: draft.revision,
    error: { code, message, retryable, ...(details === undefined ? {} : { details }) },
  };
}

function validColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function customDescriptor(
  setting: ThemeCustomSetting,
  baseline?: ThemeCustomSetting,
): DesignSettingDescriptor {
  return {
    identifier: `theme.${setting.key}`,
    type: setting.type,
    currentValue: baseline ? baseline.value : setting.value,
    stagedValue: setting.value,
    writable: setting.type !== 'image',
    ...('options' in setting ? { choices: [...setting.options] } : {}),
    ...(setting.description ? { description: setting.description } : {}),
  };
}

export function listDesignSettings(
  draft: ThemeDraft,
  baseline = draft,
): BuilderToolResult<{ settings: DesignSettingDescriptor[] }> {
  const settings: DesignSettingDescriptor[] = globalSettings.map((setting) => ({
    identifier: `global.${setting.key}`,
    type: setting.type,
    currentValue: baseline.globalSettings[setting.key],
    stagedValue: draft.globalSettings[setting.key],
    writable: setting.writable,
  }));
  const visible = visibleThemeCustomSettings(draft.customSettings);
  for (const key of Object.keys(visible).sort()) {
    settings.push(customDescriptor(visible[key], baseline.customSettings[key]));
  }
  return { ok: true, revision: draft.revision, data: { settings } };
}

function validateCustomValue(
  draft: ThemeDraft,
  setting: ThemeCustomSetting,
  value: unknown,
): BuilderToolResult<null> {
  if (setting.type === 'image') {
    return failure(
      draft,
      'setting_read_only',
      `theme.${setting.key} is an image setting and is read-only in Builder v1.`,
    );
  }
  if (setting.type === 'boolean' && typeof value !== 'boolean') {
    return failure(
      draft,
      'invalid_setting_value',
      `theme.${setting.key} requires a boolean value.`,
    );
  }
  if (setting.type === 'text' && value !== null && typeof value !== 'string') {
    return failure(
      draft,
      'invalid_setting_value',
      `theme.${setting.key} requires a text or null value.`,
    );
  }
  if (setting.type === 'color' && !validColor(value)) {
    return failure(
      draft,
      'invalid_color',
      `theme.${setting.key} requires a six-digit hexadecimal color such as #AABBCC.`,
    );
  }
  if (
    setting.type === 'select' &&
    (typeof value !== 'string' || !setting.options.includes(value))
  ) {
    return failure(
      draft,
      'invalid_option',
      `theme.${setting.key} must be one of its listed choices.`,
      false,
      { choices: setting.options },
    );
  }
  return { ok: true, revision: draft.revision, data: null };
}

export async function updateDesignSettings(
  draft: ThemeDraft,
  input: { revision: unknown; values: unknown },
): Promise<ThemeCandidateResult<{ updated: string[] }>> {
  if (typeof input.revision !== 'string' || input.revision !== draft.revision) {
    return failure(
      draft,
      'stale_revision',
      'The theme changed since this tool call was prepared. List the latest settings and retry.',
      true,
      { currentRevision: draft.revision },
    );
  }
  if (
    !input.values ||
    typeof input.values !== 'object' ||
    Array.isArray(input.values) ||
    Object.keys(input.values).length === 0
  ) {
    return failure(
      draft,
      'invalid_settings_update',
      'Provide at least one setting identifier and value.',
    );
  }
  const values = input.values as Record<string, unknown>;
  const visible = visibleThemeCustomSettings(draft.customSettings);
  for (const [identifier, value] of Object.entries(values)) {
    if (identifier.startsWith('global.')) {
      const key = identifier.slice('global.'.length) as keyof ThemeGlobalSettings;
      const definition = globalSettings.find((setting) => setting.key === key);
      if (!definition) {
        return failure(draft, 'setting_not_found', `No design setting exists at ${identifier}.`);
      }
      if (!definition.writable) {
        return failure(
          draft,
          'setting_read_only',
          `${identifier} is an image setting and is read-only in Builder v1.`,
        );
      }
      if (key === 'accent_color' && !validColor(value)) {
        return failure(
          draft,
          'invalid_color',
          `${identifier} requires a six-digit hexadecimal color such as #AABBCC.`,
        );
      }
      if (key !== 'accent_color' && value !== null && typeof value !== 'string') {
        return failure(
          draft,
          'invalid_setting_value',
          `${identifier} requires a text or null value.`,
        );
      }
      continue;
    }
    if (!identifier.startsWith('theme.')) {
      return failure(draft, 'setting_not_found', `No design setting exists at ${identifier}.`);
    }
    const key = identifier.slice('theme.'.length);
    const setting = Object.hasOwn(draft.customSettings, key)
      ? draft.customSettings[key]
      : undefined;
    if (!setting) {
      return failure(draft, 'setting_not_found', `No design setting exists at ${identifier}.`);
    }
    if (!Object.hasOwn(visible, key)) {
      return failure(
        draft,
        'setting_hidden',
        `${identifier} is currently hidden by the theme's visibility rules.`,
      );
    }
    const valid = validateCustomValue(draft, setting, value);
    if (!valid.ok) {
      return valid;
    }
  }

  const candidate = cloneThemeDraft(draft);
  for (const [identifier, value] of Object.entries(values)) {
    if (identifier.startsWith('global.')) {
      const key = identifier.slice('global.'.length) as keyof ThemeGlobalSettings;
      candidate.globalSettings[key] = value as string | null;
      continue;
    }
    const setting = candidate.customSettings[identifier.slice('theme.'.length)];
    if (setting.type === 'boolean') {
      setting.value = value as boolean;
    } else if (setting.type === 'text') {
      setting.value = value as string | null;
    } else {
      setting.value = value as string;
    }
  }
  const revised = await withThemeRevision(candidate);
  return {
    ok: true,
    revision: revised.revision,
    data: { updated: Object.keys(values) },
    candidate: revised,
  };
}
