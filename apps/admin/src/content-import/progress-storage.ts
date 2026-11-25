export const isImportId = (id: string) => /^[a-f0-9]{24}$/.test(id);

export function readImportIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string' && isImportId(id)))]
      : [];
  } catch {
    return [];
  }
}

export function writeImportIds(key: string, ids: string[]) {
  try {
    if (ids.length) {
      localStorage.setItem(key, JSON.stringify(ids));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Progress still works in this tab when browser storage is unavailable.
  }
}
