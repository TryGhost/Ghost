import React, { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import { GlobalDataContext, type GlobalData } from '@/settings/providers/global-data-context';
import useSettingGroup from './use-setting-group';

const { editSettings, setGlobalDirtyState } = vi.hoisted(() => ({
  editSettings: vi.fn(),
  setGlobalDirtyState: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tryghost/admin-x-framework/hooks')>();
  return { ...original, useHandleError: () => vi.fn() };
});

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useEditSettings: () => ({ mutateAsync: editSettings }),
}));

vi.mock('@tryghost/shade/utils', () => ({
  useGlobalDirtyState: () => ({ setGlobalDirtyState }),
}));

describe('useSettingGroup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    editSettings.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('preserves edits across a pending save and settings refresh', async () => {
    let releaseFirstSave!: () => void;
    const pending = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const initialSettings: Setting[] = [{ key: 'title', value: 'Original title' }];
    let updateSettings!: (settings: Setting[]) => void;
    let persisted = 'Original title';
    const requests: Setting[][] = [];

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const [settings, setSettings] = useState(initialSettings);
      updateSettings = setSettings;

      return (
        <GlobalDataContext.Provider value={{ settings } as GlobalData}>
          {children}
        </GlobalDataContext.Provider>
      );
    };

    editSettings.mockImplementation(async (changes: Setting[]) => {
      requests.push(changes);
      persisted = String(changes[0].value);
      if (requests.length === 1) {
        await pending;
      } else {
        updateSettings([{ key: 'title', value: persisted }]);
      }
    });

    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });

    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'First title');
    });

    let firstSave!: Promise<boolean>;
    act(() => {
      firstSave = result.current.handleSave();
    });

    act(() => {
      result.current.updateSetting('title', 'Final title');
    });

    act(() => {
      updateSettings([{ key: 'title', value: 'First title' }]);
    });

    expect(result.current.localSettings[0].value).toBe('Final title');

    let firstResult!: boolean;
    await act(async () => {
      releaseFirstSave();
      firstResult = await firstSave;
    });

    expect(firstResult).toBe(false);
    expect(result.current.isEditing).toBe(true);
    expect(result.current.saveState).toBe('unsaved');
    expect(result.current.localSettings[0].value).toBe('Final title');

    let secondResult!: boolean;
    await act(async () => {
      secondResult = await result.current.handleSave();
    });

    expect(secondResult).toBe(true);
    expect(result.current.isEditing).toBe(false);
    expect(persisted).toBe('Final title');
    expect(requests).toEqual([
      [{ key: 'title', value: 'First title' }],
      [{ key: 'title', value: 'Final title' }],
    ]);
  });
});
