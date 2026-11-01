import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StripeConnectModal from './stripe-connect-modal';

const { save, updateRoute } = vi.hoisted(() => ({ save: vi.fn(), updateRoute: vi.fn() }));

vi.mock('@/settings/components/stripe-button', () => ({ default: () => null }));
vi.mock('@/settings/hooks/use-settings-navigation', () => ({
  useSettingsNavigation: () => ({ updateRoute }),
}));
vi.mock('@/settings/hooks/use-upgrade-route', () => ({ useUpgradeRoute: () => '' }));
vi.mock('@/settings/hooks/use-setting-group', () => ({
  default: () => ({
    localSettings: [],
    updateSetting: vi.fn(),
    saveState: 'unsaved',
    handleSave: save,
  }),
}));
vi.mock('@/settings/providers/global-data-context', () => ({
  useGlobalData: () => ({ config: { stripeDirect: true }, settings: [] }),
}));
vi.mock('@/settings/providers/confirmation-context', () => ({
  useConfirmation: () => ({ showLimit: vi.fn() }),
}));
vi.mock('@/utils/navigation', () => ({ navigateTo: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useHandleError: () => vi.fn(),
  useLimiter: () => undefined,
}));
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  checkStripeEnabled: () => false,
  getSettingValue: () => undefined,
  getSettingValues: () => [],
  useDeleteStripeSettings: vi.fn(),
  useEditSettings: vi.fn(),
}));
vi.mock('@tryghost/admin-x-framework/api/members', () => ({ useBrowseMembers: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/api/tiers', () => ({
  useBrowseTiers: vi.fn(),
  useEditTier: vi.fn(),
}));
vi.mock('@tryghost/admin-x-framework/helpers', () => ({ getGhostPaths: vi.fn() }));
vi.mock('@tryghost/admin-x-framework/errors', () => ({
  HostLimitError: class extends Error {},
  JSONError: class extends Error {},
}));
vi.mock('@tryghost/shade/utils', () => ({ LucideIcon: () => null }));
vi.mock('@tryghost/shade/patterns', () => ({
  SettingsModal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@tryghost/shade/primitives', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@tryghost/shade/components', () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
    Field: Container,
    FieldError: Container,
    FieldGroup: Container,
    FieldLabel: Container,
    Input: () => <input />,
    Link: Container,
    Switch: Container,
    Textarea: Container,
  };
});
vi.mock('sonner', () => ({ toast: { dismiss: vi.fn(), error: vi.fn() } }));

describe('Stripe Direct', () => {
  beforeEach(() => {
    save.mockReset();
    updateRoute.mockReset();
  });

  it('only closes after the save succeeds', async () => {
    save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<StripeConnectModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Stripe settings' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(updateRoute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save Stripe settings' }));
    await waitFor(() => expect(updateRoute).toHaveBeenCalledWith('tiers'));
  });
});
