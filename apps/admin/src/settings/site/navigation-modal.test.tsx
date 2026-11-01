import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NavigationModal from './navigation-modal';

const { save, updateRoute } = vi.hoisted(() => ({ save: vi.fn(), updateRoute: vi.fn() }));

vi.mock('@/settings/site/navigation/navigation-edit-form', () => ({ default: () => null }));
vi.mock('@/settings/hooks/site/use-navigation-editor', () => ({
  default: () => ({ validate: () => true }),
}));
vi.mock('@/settings/hooks/site/use-navigation-link-suggestions', () => ({
  default: () => ({ loadSuggestions: vi.fn() }),
}));
vi.mock('@/settings/hooks/use-settings-navigation', () => ({
  useSettingsNavigation: () => ({ updateRoute }),
}));
vi.mock('@/settings/hooks/use-setting-group', () => ({
  default: () => ({
    localSettings: [],
    updateSetting: vi.fn(),
    saveState: 'unsaved',
    handleSave: save,
    siteData: { url: 'https://example.com' },
  }),
}));
vi.mock('@/settings/providers/global-data-context', () => ({
  useGlobalData: () => ({ config: {} }),
}));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFeatureFlag: () => false,
  useHandleError: () => vi.fn(),
}));
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
  checkStripeEnabled: () => false,
  getSettingValues: () => [],
}));
vi.mock('@tryghost/admin-x-framework/api/images', () => ({
  useUploadImage: () => ({ mutateAsync: vi.fn() }),
  getImageUrl: vi.fn(),
}));
vi.mock('@tryghost/admin-x-framework/errors', () => ({
  APIError: class APIError extends Error {},
}));
vi.mock('@tryghost/shade/patterns', () => ({
  SettingsModal: ({ onOk }: { onOk: () => void }) => (
    <button type="button" onClick={onOk}>
      Save
    </button>
  ),
}));
vi.mock('@tryghost/shade/components', () => ({
  Tabs: () => null,
  TabsContent: () => null,
  TabsList: () => null,
  TabsTrigger: () => null,
}));

describe('NavigationModal', () => {
  beforeEach(() => {
    save.mockReset();
    updateRoute.mockReset();
  });

  it('only closes after the save succeeds', async () => {
    save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<NavigationModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(updateRoute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateRoute).toHaveBeenCalledWith('navigation'));
  });
});
