import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import type { Tier } from '@tryghost/admin-x-framework/api/tiers';
import type { Dirtyable } from '@tryghost/admin-x-framework/hooks';
import PortalModal from './portal-modal';

const { editSettings, editTier, settings, tiers } = vi.hoisted(() => ({
  editSettings: vi.fn<(settings: Dirtyable<Setting>[]) => Promise<{ settings: Setting[] }>>(),
  editTier: vi.fn<(tier: Dirtyable<Tier>) => Promise<void>>(),
  settings: [{ key: 'portal_button', value: 'Original' }],
  tiers: [{ id: 'tier-1', name: 'Original' }],
}));

vi.mock('./signup-options', () => ({
  default: ({
    localSettings,
    localTiers,
    updateSetting,
    updateTier,
  }: {
    localSettings: Array<{ value: string }>;
    localTiers: Array<{ id: string; name: string }>;
    updateSetting: (key: string, value: string) => void;
    updateTier: (tier: { id: string; name: string }) => void;
  }) => (
    <>
      <input
        aria-label="Setting"
        value={localSettings[0].value}
        onChange={(event) => updateSetting('portal_button', event.target.value)}
      />
      <input
        aria-label="Tier"
        value={localTiers[0].name}
        onChange={(event) => updateTier({ ...localTiers[0], name: event.target.value })}
      />
    </>
  ),
}));
vi.mock('./account-page', () => ({ default: () => null }));
vi.mock('./look-and-feel', () => ({ default: () => null }));
vi.mock('./portal-preview', () => ({ default: () => null }));
vi.mock('@/settings/hooks/use-query-params', () => ({
  default: () => ({ getParam: () => undefined }),
}));
vi.mock('@/settings/hooks/use-settings-navigation', () => ({
  useSettingsNavigation: () => ({ updateRoute: vi.fn() }),
}));
vi.mock('@/settings/providers/confirmation-context', () => ({
  useConfirmation: () => ({ confirm: vi.fn() }),
}));
vi.mock('@/settings/providers/global-data-context', () => ({
  useGlobalData: () => ({ settings, siteData: {}, config: {} }),
}));
vi.mock('@/settings/components/preview-modal', () => ({
  PreviewModalContent: ({ sidebar, onOk }: { sidebar: React.ReactNode; onOk: () => void }) => (
    <div>
      {sidebar}
      <button type="button" onClick={onOk}>
        Save
      </button>
    </div>
  ),
}));
vi.mock('@tryghost/admin-x-framework/hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tryghost/admin-x-framework/hooks')>();
  return { ...original, useHandleError: () => vi.fn() };
});
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  getSettingValues: () => [],
  useEditSettings: () => ({ mutateAsync: editSettings }),
}));
vi.mock('@tryghost/admin-x-framework/api/tiers', () => ({
  useBrowseTiers: () => ({ data: { tiers } }),
  useEditTier: () => ({ mutateAsync: editTier }),
}));
vi.mock('@tryghost/admin-x-framework/api/site', () => ({ fullEmailAddress: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/api/email-verification', () => ({
  useVerifyEmailToken: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@tryghost/shade/app', () => ({ useFocusContext: () => ({ darkMode: false }) }));
vi.mock('@tryghost/shade/components', () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { Tabs: Container, TabsContent: Container, TabsList: Container, TabsTrigger: Container };
});

describe('PortalModal pending saves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    editSettings.mockReset();
    editTier.mockReset();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('preserves a newer setting when an earlier settings response arrives', async () => {
    let release!: (value: { settings: typeof settings }) => void;
    editSettings.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    editSettings.mockResolvedValueOnce({ settings });
    render(<PortalModal />);
    const input = screen.getByRole('textbox', { name: 'Setting' });
    fireEvent.change(input, { target: { value: 'A' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await Promise.resolve();
    });
    expect(editSettings).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: 'B' } });
    await act(async () => {
      release({ settings });
      await vi.advanceTimersByTimeAsync(500);
    });
    expect((input as HTMLInputElement).value).toBe('B');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(editSettings.mock.calls[1][0][0]).toMatchObject({ value: 'B', dirty: true });
  });

  it('preserves a newer tier when an earlier tier response arrives', async () => {
    let release!: () => void;
    editTier.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    editTier.mockResolvedValueOnce(undefined);
    render(<PortalModal />);
    const input = screen.getByRole('textbox', { name: 'Tier' });
    fireEvent.change(input, { target: { value: 'A' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await Promise.resolve();
    });
    expect(editTier).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: 'B' } });
    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(500);
    });
    expect((input as HTMLInputElement).value).toBe('B');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(editTier.mock.calls[1][0]).toMatchObject({ name: 'B', dirty: true });
  });
});
