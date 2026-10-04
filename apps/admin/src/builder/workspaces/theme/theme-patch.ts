import { cloneThemeDraft, withThemeRevision } from './theme-state';
import {
  deleteThemeFile,
  replaceThemeFileText,
  themeWriteContent,
  writeThemeFile,
} from './theme-tools';
import { updateDesignSettings } from './design-setting-tools';
import type { ThemeDraft } from './theme-state';
import type { ThemeCandidateResult } from './theme-tools';

export type ThemePatchData = { paths: string[]; settings: string[]; unchanged: boolean };

export type ThemeFilePatch =
  | { operation: 'write'; path: string; content: string }
  | { operation: 'replace'; path: string; oldText: string; newText: string }
  | { operation: 'delete'; path: string };
export type ThemePatch = {
  revision: string;
  files?: ThemeFilePatch[];
  settings?: Record<string, unknown>;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function stageThemePatch(
  draft: ThemeDraft,
  input: unknown,
): Promise<ThemeCandidateResult<ThemePatchData>> {
  const invalid = (message: string): ThemeCandidateResult<ThemePatchData> => ({
    ok: false,
    revision: draft.revision,
    error: { code: 'invalid_theme_patch', message, retryable: false },
  });
  if (
    !record(input) ||
    Object.keys(input).some((key) => !['revision', 'files', 'settings'].includes(key))
  ) {
    return invalid('Provide only the expected revision, file operations and design settings.');
  }
  if (input.revision !== draft.revision) {
    return {
      ok: false,
      revision: draft.revision,
      error: {
        code: 'stale_revision',
        message: 'Read the current theme revision before preparing a patch.',
        retryable: true,
      },
    };
  }
  const files = input.files === undefined ? [] : input.files;
  if (
    !Array.isArray(files) ||
    files.length > 32 ||
    (input.settings !== undefined &&
      (!record(input.settings) || Object.keys(input.settings).length > 32))
  ) {
    return invalid('A patch supports at most 32 file operations and 32 design settings.');
  }
  const paths = new Set<string>();
  const operations: Exclude<ThemeFilePatch, { operation: 'replace' }>[] = [];
  for (const file of files) {
    if (
      !record(file) ||
      typeof file.path !== 'string' ||
      paths.has(file.path) ||
      !['write', 'delete', 'replace'].includes(String(file.operation)) ||
      Object.keys(file).some(
        (key) =>
          !(
            file.operation === 'write'
              ? ['operation', 'path', 'content']
              : file.operation === 'replace'
                ? ['operation', 'path', 'oldText', 'newText']
                : ['operation', 'path']
          ).includes(key),
      ) ||
      (file.operation === 'write' && typeof file.content !== 'string') ||
      (file.operation === 'replace' &&
        (typeof file.oldText !== 'string' || typeof file.newText !== 'string'))
    ) {
      return invalid(
        'Each file has one explicit write, replace or delete operation; paths cannot repeat.',
      );
    }
    paths.add(file.path);
    if (file.operation === 'replace') {
      const resolved = replaceThemeFileText(draft, file.path, file.oldText, file.newText);
      if (!resolved.ok) {
        return { ...resolved, error: { ...resolved.error, details: { path: file.path } } };
      }
      operations.push({ operation: 'write', path: file.path, content: resolved.data.content });
    } else {
      operations.push({ ...file } as Exclude<ThemeFilePatch, { operation: 'replace' }>);
    }
  }

  const candidate = cloneThemeDraft(draft);
  const staged = new Map(Object.entries(candidate.files));
  for (const file of operations) {
    if (file.operation === 'delete') {
      staged.delete(file.path);
    } else {
      file.content = themeWriteContent(draft, file.path, file.content);
      const previous = staged.get(file.path);
      staged.set(
        file.path,
        previous
          ? { ...previous, content: file.content }
          : {
              path: file.path,
              content: file.content,
              kind: 'text',
              binary: null,
              unixPermissions: null,
              dosPermissions: null,
            },
      );
    }
  }
  candidate.files = Object.fromEntries(staged);
  // Validate paths, assets and aggregate limits against the complete file set.
  // Intermediate template references or byte totals never become a candidate.
  for (const file of operations) {
    let checked;
    if (file.operation === 'write') {
      const validationDraft = cloneThemeDraft(candidate);
      if (!Object.hasOwn(draft.files, file.path)) {
        delete validationDraft.files[file.path];
      }
      checked = await writeThemeFile(validationDraft, {
        revision: validationDraft.revision,
        path: file.path,
        content: file.content,
      });
    } else {
      const validationDraft = cloneThemeDraft(candidate);
      const original = Object.hasOwn(draft.files, file.path) ? draft.files[file.path] : undefined;
      if (original) {
        validationDraft.files = Object.fromEntries([
          ...Object.entries(validationDraft.files),
          [file.path, original],
        ]);
      }
      checked = await deleteThemeFile(validationDraft, {
        revision: validationDraft.revision,
        path: file.path,
      });
    }
    if (!checked.ok) {
      return {
        ...checked,
        revision: draft.revision,
        error: {
          ...checked.error,
          details: {
            ...(record(checked.error.details) ? checked.error.details : {}),
            path: file.path,
          },
        },
      };
    }
  }
  const settings = input.settings;
  if (settings && Object.keys(settings).length) {
    const checked = await updateDesignSettings(candidate, {
      revision: candidate.revision,
      values: settings,
    });
    if (!checked.ok) {
      return { ...checked, revision: draft.revision };
    }
    candidate.globalSettings = checked.candidate.globalSettings;
    candidate.customSettings = checked.candidate.customSettings;
  }
  const revised = await withThemeRevision(candidate);
  return {
    ok: true,
    revision: revised.revision,
    candidate: revised,
    data: {
      paths: [...paths],
      settings: Object.keys(settings ?? {}),
      unchanged: revised.revision === draft.revision,
    },
  };
}
