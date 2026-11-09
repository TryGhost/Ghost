import { afterEach, describe, expect, it } from 'vitest';
import {
  SETTINGS_OPEN_KEY,
  readSettingsOpen,
  remembersSettingsToggle,
  settingsOpenAtStart,
  writeSettingsOpen,
} from './settings-open';

const blocked = (): Storage => {
  throw new DOMException('The operation is insecure.', 'SecurityError');
};

afterEach(() => {
  localStorage.clear();
});

describe('readSettingsOpen', () => {
  it('reads the state the writer last left the panel in', () => {
    localStorage.setItem(SETTINGS_OPEN_KEY, 'open');
    expect(readSettingsOpen()).toBe(true);
    localStorage.setItem(SETTINGS_OPEN_KEY, 'closed');
    expect(readSettingsOpen()).toBe(false);
  });

  it('reads closed when nothing is stored', () => {
    expect(readSettingsOpen()).toBe(false);
  });

  it('reads closed from a value it does not know', () => {
    localStorage.setItem(SETTINGS_OPEN_KEY, 'true');
    expect(readSettingsOpen()).toBe(false);
    localStorage.setItem(SETTINGS_OPEN_KEY, '{"open":');
    expect(readSettingsOpen()).toBe(false);
  });

  it('reads closed where storage is blocked', () => {
    expect(readSettingsOpen(blocked)).toBe(false);
  });
});

describe('writeSettingsOpen', () => {
  it('stores the state for the next read', () => {
    writeSettingsOpen(true);
    expect(localStorage.getItem(SETTINGS_OPEN_KEY)).toBe('open');
    expect(readSettingsOpen()).toBe(true);
    writeSettingsOpen(false);
    expect(localStorage.getItem(SETTINGS_OPEN_KEY)).toBe('closed');
    expect(readSettingsOpen()).toBe(false);
  });

  it('gives up quietly where storage is blocked or full', () => {
    expect(() => writeSettingsOpen(true, blocked)).not.toThrow();
    const full = {
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    } as unknown as Storage;
    expect(() => writeSettingsOpen(true, () => full)).not.toThrow();
  });
});

describe('settingsOpenAtStart', () => {
  it('opens the panel the writer left open, where it sits beside the editor', () => {
    expect(settingsOpenAtStart({ overlay: false, stored: true })).toBe(true);
  });

  it('keeps the panel closed when the writer left it closed', () => {
    expect(settingsOpenAtStart({ overlay: false, stored: false })).toBe(false);
  });

  it('keeps the panel closed where it would cover the editor, whatever was stored', () => {
    expect(settingsOpenAtStart({ overlay: true, stored: true })).toBe(false);
    expect(settingsOpenAtStart({ overlay: true, stored: false })).toBe(false);
  });
});

describe('remembersSettingsToggle', () => {
  it('remembers a toggle where the panel sits beside the editor', () => {
    expect(remembersSettingsToggle({ overlay: false })).toBe(true);
  });

  it('forgets a toggle where the panel covers the editor', () => {
    expect(remembersSettingsToggle({ overlay: true })).toBe(false);
  });
});
