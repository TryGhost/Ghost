import { act, renderHook } from '@testing-library/react';
import useSettingGroup from '@/settings/hooks/use-setting-group';

const { editSettings, globalData, setGlobalDirtyState } = vi.hoisted(() => ({
  editSettings: vi.fn(),
  globalData: vi.fn(),
  setGlobalDirtyState: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/hooks')>()),
  useHandleError: () => vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useEditSettings: () => ({ mutateAsync: editSettings }),
}));

vi.mock('@tryghost/shade/utils', () => ({
  useGlobalDirtyState: () => ({ setGlobalDirtyState }),
}));

vi.mock('@/settings/providers/global-data-context', () => ({
  useGlobalData: globalData,
}));

function settings(title: string) {
  return [{ key: 'title', value: title }];
}

function pendingSave() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  editSettings.mockReturnValueOnce(promise);
  return resolve;
}

describe('useSettingGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalData.mockReturnValue({ settings: settings('Initial title'), siteData: null });
  });

  it('keeps a newer draft open across the previous save response and saves it next', async () => {
    const resolve = pendingSave();
    const { result, rerender } = renderHook(() => useSettingGroup());
    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'Title A');
    });
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.handleSave();
    });
    expect(editSettings).toHaveBeenCalledExactlyOnceWith(settings('Title A'));

    act(() => result.current.updateSetting('title', 'Title B'));
    globalData.mockReturnValue({ settings: settings('Title A'), siteData: null });
    rerender();
    expect(result.current.localSettings).toEqual([{ key: 'title', value: 'Title B', dirty: true }]);

    await act(async () => {
      resolve();
      expect(await saving).toBe(false);
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.saveState).toBe('unsaved');
    expect(setGlobalDirtyState).toHaveBeenLastCalledWith(true);

    globalData.mockReturnValue({ settings: settings('Title B'), siteData: null });
    await act(async () => {
      expect(await result.current.handleSave()).toBe(true);
    });
    expect(editSettings.mock.calls).toEqual([[settings('Title A')], [settings('Title B')]]);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.localSettings).toEqual(settings('Title B'));
    expect(setGlobalDirtyState).toHaveBeenLastCalledWith(false);
  });

  it('closes and adopts the API response when the draft has not changed', async () => {
    const resolve = pendingSave();
    const { result, rerender } = renderHook(() => useSettingGroup());
    act(() => {
      result.current.handleEditingChange(true);
      result.current.updateSetting('title', 'Title A');
    });
    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.handleSave();
    });

    globalData.mockReturnValue({ settings: settings('Canonical title'), siteData: null });
    rerender();
    await act(async () => {
      resolve();
      expect(await saving).toBe(true);
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.localSettings).toEqual(settings('Canonical title'));
    expect(setGlobalDirtyState).toHaveBeenLastCalledWith(false);
  });
});
