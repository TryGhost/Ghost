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

  it('preserves a modal edit through a refresh and saves the newer value on retry', async () => {
    let release!: (response: { settings: Setting[] }) => void;
    const pending = new Promise<{ settings: Setting[] }>((resolve) => {
      release = resolve;
    });
    let refresh!: (settings: Setting[]) => void;
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const [settings, setSettings] = useState<Setting[]>([{ key: 'title', value: 'Original' }]);
      refresh = setSettings;
      return (
        <GlobalDataContext.Provider value={{ settings } as GlobalData}>
          {children}
        </GlobalDataContext.Provider>
      );
    };
    editSettings.mockReturnValueOnce(pending).mockResolvedValueOnce({
      settings: [{ key: 'title', value: 'B' }],
    });
    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });

    act(() => result.current.updateSetting('title', 'A'));
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.handleSave();
    });
    act(() => result.current.updateSetting('title', 'B'));
    act(() => refresh([{ key: 'title', value: 'A' }]));
    expect(result.current.localSettings[0]).toMatchObject({ value: 'B', dirty: true });
    await act(async () => {
      release({ settings: [{ key: 'title', value: 'A' }] });
      expect(await first).toBe(false);
    });
    await act(async () => {
      expect(await result.current.handleSave()).toBe(true);
    });
    expect(editSettings.mock.calls).toEqual([
      [[{ key: 'title', value: 'A' }]],
      [[{ key: 'title', value: 'B' }]],
    ]);
    expect(result.current.localSettings[0]).toMatchObject({ value: 'B' });
    expect(result.current.localSettings[0].dirty).not.toBe(true);
  });

  it('keeps invalid edits during refresh and restores the latest settings on cancel', async () => {
    let refresh!: (settings: Setting[]) => void;
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const [settings, setSettings] = useState<Setting[]>([{ key: 'title', value: 'Original' }]);
      refresh = setSettings;
      return (
        <GlobalDataContext.Provider value={{ settings } as GlobalData}>
          {children}
        </GlobalDataContext.Provider>
      );
    };
    const { result } = renderHook(
      () => useSettingGroup({ onValidate: () => ({ title: 'Invalid' }) }),
      { wrapper: Wrapper },
    );
    act(() => result.current.updateSetting('title', 'Invalid'));
    await act(async () => {
      expect(await result.current.handleSave()).toBe(false);
    });
    expect(result.current.saveState).toBe('error');
    act(() => refresh([{ key: 'title', value: 'Remote' }]));
    expect(result.current.localSettings[0]).toMatchObject({ value: 'Invalid', dirty: true });
    act(() => result.current.handleCancel());
    expect(result.current.localSettings[0]).toEqual({ key: 'title', value: 'Remote' });
    act(() => refresh([{ key: 'title', value: 'Latest' }]));
    expect(result.current.localSettings[0].value).toBe('Latest');
  });

  it('shows refreshed settings after leaving an unchanged editor', async () => {
    let refresh!: (settings: Setting[]) => void;
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const [settings, setSettings] = useState<Setting[]>([{ key: 'title', value: 'Original' }]);
      refresh = setSettings;
      return (
        <GlobalDataContext.Provider value={{ settings } as GlobalData}>
          {children}
        </GlobalDataContext.Provider>
      );
    };
    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });
    act(() => result.current.handleEditingChange(true));
    act(() => refresh([{ key: 'title', value: 'Remote' }]));
    expect(result.current.localSettings[0].value).toBe('Original');
    await act(async () => {
      expect(await result.current.handleSave()).toBe(true);
    });
    expect(result.current.localSettings[0].value).toBe('Remote');
  });

  it('uses the latest refresh when an unchanged delayed save completes', async () => {
    let refresh!: (settings: Setting[]) => void;
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const [settings, setSettings] = useState<Setting[]>([{ key: 'title', value: 'Original' }]);
      refresh = setSettings;
      return (
        <GlobalDataContext.Provider value={{ settings } as GlobalData}>
          {children}
        </GlobalDataContext.Provider>
      );
    };
    const { result } = renderHook(() => useSettingGroup({ savingDelay: 500 }), {
      wrapper: Wrapper,
    });
    act(() => result.current.handleEditingChange(true));
    let save!: Promise<boolean>;
    act(() => {
      save = result.current.handleSave({ fakeWhenUnchanged: true });
    });
    act(() => refresh([{ key: 'title', value: 'Remote' }]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
      expect(await save).toBe(true);
    });
    expect(result.current.localSettings[0].value).toBe('Remote');
    expect(editSettings).not.toHaveBeenCalled();
  });

  it('restores a refresh skipped during editing when canceled and reopened', () => {
    let refresh!: (settings: Setting[]) => void;
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      const [settings, setSettings] = useState<Setting[]>([{ key: 'title', value: 'Original' }]);
      refresh = setSettings;
      return (
        <GlobalDataContext.Provider value={{ settings } as GlobalData}>
          {children}
        </GlobalDataContext.Provider>
      );
    };
    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });
    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'Draft');
    });
    act(() => refresh([{ key: 'title', value: 'Remote' }]));
    expect(result.current.localSettings[0].value).toBe('Draft');
    act(() => result.current.handleCancel());
    act(() => result.current.handleEditingChange(true));
    expect(result.current.localSettings[0]).toEqual({ key: 'title', value: 'Remote' });
  });

  it('uses the saved response when editing ends before context refreshes', async () => {
    const settings: Setting[] = [{ key: 'title', value: 'Original' }];
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <GlobalDataContext.Provider value={{ settings } as GlobalData}>
        {children}
      </GlobalDataContext.Provider>
    );
    editSettings.mockResolvedValue({ settings: [{ key: 'title', value: 'Normalized' }] });
    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });
    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'Changed');
    });
    await act(async () => {
      expect(await result.current.handleSave()).toBe(true);
    });
    expect(result.current.localSettings[0].value).toBe('Normalized');
    act(() => result.current.handleEditingChange(true));
    act(() => result.current.handleCancel());
    expect(result.current.localSettings[0].value).toBe('Normalized');
  });

  it('keeps the saved response when an unchanged editor closes before context refreshes', async () => {
    const settings: Setting[] = [{ key: 'title', value: 'Original' }];
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <GlobalDataContext.Provider value={{ settings } as GlobalData}>
        {children}
      </GlobalDataContext.Provider>
    );
    editSettings.mockResolvedValue({ settings: [{ key: 'title', value: 'Normalized' }] });
    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });
    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'Changed');
    });
    await act(async () => {
      expect(await result.current.handleSave()).toBe(true);
    });
    act(() => result.current.handleEditingChange(true));
    await act(async () => {
      expect(await result.current.handleSave()).toBe(true);
    });
    expect(result.current.localSettings[0].value).toBe('Normalized');
  });

  it('does not restore a completed request over a canceled edit', async () => {
    let release!: (response: { settings: Setting[] }) => void;
    const pending = new Promise<{ settings: Setting[] }>((resolve) => {
      release = resolve;
    });
    const settings: Setting[] = [{ key: 'title', value: 'Original' }];
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <GlobalDataContext.Provider value={{ settings } as GlobalData}>
        {children}
      </GlobalDataContext.Provider>
    );
    editSettings.mockReturnValue(pending);
    const { result } = renderHook(() => useSettingGroup(), { wrapper: Wrapper });
    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'Changed');
    });
    let save!: Promise<boolean>;
    act(() => {
      save = result.current.handleSave();
    });
    act(() => result.current.handleCancel());
    await act(async () => {
      release({ settings: [{ key: 'title', value: 'Changed' }] });
      expect(await save).toBe(false);
    });
    expect(result.current.localSettings[0].value).toBe('Original');
    expect(result.current.saveState).toBe('');
  });
});
