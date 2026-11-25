import { afterEach, describe, expect, it, vi } from 'vitest';
import { readImportIds, writeImportIds } from './progress-storage';

const id = 'abcdefabcdefabcdefabcdef';
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('CSV progress storage', () => {
  it('retains only unique valid IDs and removes an empty list', () => {
    expect(readImportIds('imports')).toEqual([]);
    writeImportIds('imports', [id]);
    expect(readImportIds('imports')).toEqual([id]);
    localStorage.setItem('imports', JSON.stringify([id, id, '../source', 42]));
    expect(readImportIds('imports')).toEqual([id]);
    writeImportIds('imports', []);
    expect(localStorage.getItem('imports')).toBeNull();
  });
  it('ignores malformed or unavailable browser storage', () => {
    localStorage.setItem('imports', 'bad json');
    expect(readImportIds('imports')).toEqual([]);
    localStorage.setItem('imports', '{}');
    expect(readImportIds('imports')).toEqual([]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readImportIds('imports')).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => writeImportIds('imports', [id])).not.toThrow();
  });
});
