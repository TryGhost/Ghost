import React from 'react';
import { act, renderHook } from '@testing-library/react';
import type { CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';
import type { Dirtyable } from '@tryghost/admin-x-framework/hooks';
import { GlobalDataContext, type GlobalData } from '@/settings/providers/global-data-context';
import { useDesignForm } from './use-design-form';

const { editSettings, editThemeSettings, themeData } = vi.hoisted(() => ({
  editSettings: vi.fn(),
  editThemeSettings:
    vi.fn<
      (
        settings: Dirtyable<CustomThemeSetting>[],
      ) => Promise<{ custom_theme_settings: CustomThemeSetting[] }>
    >(),
  themeData: {
    current: undefined as
      | undefined
      | {
          custom_theme_settings: Array<{
            id: string;
            key: string;
            type: 'text';
            value: string;
            default: string;
          }>;
        },
  },
}));

vi.mock('@tryghost/admin-x-framework/hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tryghost/admin-x-framework/hooks')>();
  return { ...original, useHandleError: () => vi.fn() };
});
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  useEditSettings: () => ({ mutateAsync: editSettings }),
  getSettingValues: (settings: Array<{ key: string; value: unknown }>, keys: string[]) =>
    keys.map((key) => settings.find((setting) => setting.key === key)?.value),
}));
vi.mock('@tryghost/admin-x-framework/api/custom-theme-settings', () => ({
  useBrowseCustomThemeSettings: () => ({ data: themeData.current }),
  useEditCustomThemeSettings: () => ({ mutateAsync: editThemeSettings }),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalDataContext.Provider
    value={{ settings: [{ key: 'description', value: 'Original' }] } as GlobalData}
  >
    {children}
  </GlobalDataContext.Provider>
);

describe('useDesignForm pending saves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    editSettings.mockReset();
    editThemeSettings.mockReset();
    themeData.current = undefined;
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('preserves a newer global edit when the earlier response arrives, then sends it on retry', async () => {
    let release!: (value: { settings: Array<{ key: string; value: string }> }) => void;
    editSettings.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    editSettings.mockResolvedValueOnce({ settings: [{ key: 'description', value: 'B' }] });
    const { result } = renderHook(() => useDesignForm(), { wrapper: Wrapper });
    act(() => result.current.updateGlobalSetting('description', 'A'));
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.handleSave();
    });
    act(() => result.current.updateGlobalSetting('description', 'B'));
    await act(async () => {
      release({ settings: [{ key: 'description', value: 'A' }] });
      await vi.advanceTimersByTimeAsync(500);
      expect(await first).toBe(false);
    });
    expect(result.current.globalSettings.description).toBe('B');
    await act(async () => {
      const retry = result.current.handleSave();
      await vi.advanceTimersByTimeAsync(500);
      expect(await retry).toBe(true);
    });
    expect(editSettings.mock.calls).toEqual([
      [[{ key: 'description', value: 'A', dirty: true }]],
      [[{ key: 'description', value: 'B', dirty: true }]],
    ]);
  });

  it('preserves a newer theme edit across query refresh and the earlier response', async () => {
    const original = {
      id: '1',
      key: 'heading',
      type: 'text' as const,
      value: 'Original',
      default: '',
    };
    themeData.current = { custom_theme_settings: [original] };
    let release!: (value: { custom_theme_settings: (typeof original)[] }) => void;
    editThemeSettings.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    editThemeSettings.mockResolvedValueOnce({
      custom_theme_settings: [{ ...original, value: 'B' }],
    });
    const { result, rerender } = renderHook(() => useDesignForm(), { wrapper: Wrapper });
    act(() => result.current.updateThemeSetting({ ...original, value: 'A' }));
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.handleSave();
    });
    act(() => result.current.updateThemeSetting({ ...original, value: 'B' }));
    themeData.current = { custom_theme_settings: [{ ...original, value: 'A' }] };
    rerender();
    expect(result.current.previewSettings.themeSettings?.[0].value).toBe('B');
    await act(async () => {
      release({ custom_theme_settings: [{ ...original, value: 'A' }] });
      await vi.advanceTimersByTimeAsync(500);
      expect(await first).toBe(false);
    });
    expect(result.current.previewSettings.themeSettings?.[0].value).toBe('B');
    await act(async () => {
      const retry = result.current.handleSave();
      await vi.advanceTimersByTimeAsync(500);
      expect(await retry).toBe(true);
    });
    expect(editThemeSettings).toHaveBeenCalledTimes(2);
    expect(editThemeSettings.mock.calls[1][0][0]).toMatchObject({ value: 'B', dirty: true });
  });
});
