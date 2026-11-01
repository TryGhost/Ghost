import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import UserDetailModal from './user-detail-modal';

const { editUser, user } = vi.hoisted(() => ({
  editUser: vi.fn(),
  user: {
    id: '1',
    slug: 'author',
    name: 'Original',
    email: 'author@example.com',
    status: 'active',
    roles: [{ name: 'Author' }],
  },
}));

vi.mock('@/settings/general/users/profile-tab', () => ({
  default: ({
    user: profile,
    setUserData,
  }: {
    user: typeof user;
    setUserData: (value: typeof user) => void;
  }) => (
    <input
      aria-label="Name"
      value={profile.name}
      onChange={(event) => setUserData({ ...profile, name: event.target.value })}
    />
  ),
}));
vi.mock('@/settings/general/users/social-links-tab', () => ({ default: () => null }));
vi.mock('@/settings/general/users/email-notifications-tab', () => ({ default: () => null }));
vi.mock('@/settings/hooks/use-pintura-editor', () => ({ default: () => ({ isEnabled: false }) }));
vi.mock('@/settings/hooks/use-staff-users', () => ({ default: () => ({ ownerUser: undefined }) }));
vi.mock('@/settings/hooks/use-settings-navigation', () => ({
  useSettingsNavigation: () => ({ updateRoute: vi.fn() }),
}));
vi.mock('@/settings/hooks/use-upgrade-route', () => ({ useUpgradeRoute: () => '' }));
vi.mock('@/settings/providers/global-data-context', () => ({
  useGlobalData: () => ({ currentUser: user }),
}));
vi.mock('@/settings/providers/confirmation-context', () => ({
  useConfirmation: () => ({ confirm: vi.fn(), showLimit: vi.fn() }),
}));
vi.mock('@/settings/utils/social-urls/index', () => ({
  SOCIAL_PLATFORM_CONFIGS: [],
  SOCIAL_PLATFORM_KEYS: [],
  getSocialValidationError: vi.fn(),
}));
vi.mock('@/utils/navigation', () => ({ navigateTo: vi.fn() }));
vi.mock('@tryghost/admin-x-framework', () => ({
  useLocation: () => ({ pathname: '/settings/staff/author' }),
  useNavigate: () => vi.fn(),
  useParams: () => ({ slug: 'author' }),
}));
vi.mock('@tryghost/admin-x-framework/hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tryghost/admin-x-framework/hooks')>();
  return { ...original, useHandleError: () => vi.fn(), useLimiter: () => undefined };
});
vi.mock('@tryghost/admin-x-framework/api/users', () => ({
  canAccessSettings: () => true,
  hasAdminAccess: () => false,
  isAdminUser: () => false,
  isAuthorOrContributor: () => false,
  isEditorUser: () => false,
  isOwnerUser: () => false,
  useDeleteUser: () => ({ mutateAsync: vi.fn() }),
  useEditUser: () => ({ mutateAsync: editUser }),
  useGetUserBySlug: () => ({}),
  useMakeOwner: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@tryghost/admin-x-framework/api/images', () => ({
  getImageUrl: vi.fn(),
  useUploadImage: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@tryghost/admin-x-framework/errors', () => ({
  APIError: class extends Error {},
  HostLimitError: class extends Error {},
}));
vi.mock('@tryghost/shade/app', () => ({ useShade: () => ({ isAdmin7: false }) }));
vi.mock('@tryghost/shade/utils', () => ({
  LucideIcon: { UserPlus: () => null, Ellipsis: () => null },
}));
vi.mock('@tryghost/shade/primitives', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@tryghost/shade/components', () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Button: Container,
    DropdownMenu: Container,
    DropdownMenuContent: Container,
    DropdownMenuItem: Container,
    DropdownMenuTrigger: Container,
    Dropzone: Container,
    Tabs: Container,
    TabsContent: Container,
    TabsList: Container,
    TabsTrigger: Container,
    imageOverlayButton: () => '',
  };
});
vi.mock('@tryghost/shade/patterns', () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    ImageUpload: Container,
    ImageUploadAction: Container,
    ImageUploadActions: Container,
    ImageUploadDropzone: Container,
    ImageUploadImage: Container,
    ImageUploadPreview: Container,
    SettingsModal: ({ children, onOk }: { children: React.ReactNode; onOk: () => void }) => (
      <div>
        {children}
        <button type="button" onClick={onOk}>
          Save
        </button>
      </div>
    ),
  };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('UserDetailModal pending saves', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    editUser.mockReset();
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('preserves a newer profile edit when an earlier response arrives', async () => {
    let release!: (value: { users: (typeof user)[] }) => void;
    editUser.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    editUser.mockResolvedValueOnce({ users: [{ ...user, name: 'B' }] });
    render(<UserDetailModal />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: 'A' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await Promise.resolve();
    });
    expect(editUser).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: 'B' } });
    await act(async () => {
      release({ users: [{ ...user, name: 'A' }] });
      await vi.advanceTimersByTimeAsync(500);
    });
    expect((input as HTMLInputElement).value).toBe('B');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(editUser.mock.calls[1][0]).toMatchObject({ name: 'B' });
  });
});
