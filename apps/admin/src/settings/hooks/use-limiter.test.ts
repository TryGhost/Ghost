import {renderHook, waitFor} from '@testing-library/react';
import {useLimiter} from '@/settings/hooks/use-limiter';

const mockConfig = vi.fn<() => unknown>();
const staffUsers = {users: [], contributorUsers: [], invites: [], isLoading: false};
const noopRefetch = vi.fn();

vi.mock('@/settings/providers/global-data-context', () => ({
    useGlobalData: () => ({config: mockConfig()})
}));

vi.mock('./use-staff-users', () => ({
    default: () => staffUsers
}));

vi.mock('@tryghost/admin-x-framework/api/members', () => ({
    useBrowseMembers: () => ({refetch: noopRefetch})
}));

vi.mock('@tryghost/admin-x-framework/api/newsletters', () => ({
    useBrowseNewsletters: () => ({refetch: noopRefetch})
}));

describe('useLimiter', () => {
    // `emails` is declared first on purpose: a limit that throws while registering takes
    // every limit after it down too, so waiting on `members` is what catches that
    const limits = {emails: {maxPeriodic: 100}, members: {max: 100}};

    const renderLimiter = async (hostSettings: Record<string, unknown>) => {
        mockConfig.mockReturnValue({hostSettings});

        const {result} = renderHook(() => useLimiter());

        // The limit service is imported lazily, so the hook hands back a no-op until it lands
        await waitFor(() => expect(result.current.isLimited('members')).toBe(true));

        return result.current;
    };

    it('registers a periodic limit when a subscription anchors the period', async () => {
        const limiter = await renderLimiter({
            limits,
            subscription: {start: '2026-08-21T04:16:53.000Z'}
        });

        expect(limiter.isLimited('emails')).toBe(true);
    });

    it('skips a periodic limit that has no subscription to anchor it', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const limiter = await renderLimiter({limits});

        expect(limiter.isLimited('emails')).toBe(false);
        expect(warn).toHaveBeenCalledWith('Skipping emails limit: periodic limits need hostSettings.subscription');

        warn.mockRestore();
    });

    it('treats a subscription without a start as no subscription at all', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const limiter = await renderLimiter({limits, subscription: {}});

        expect(limiter.isLimited('emails')).toBe(false);

        warn.mockRestore();
    });
});
