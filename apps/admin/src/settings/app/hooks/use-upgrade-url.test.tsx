import {renderHook} from '@testing-library/react';
import {useUpgradeUrl} from '@/settings/app/hooks/use-upgrade-url';

const mockConfig = vi.fn();

vi.mock('@/settings/app/components/providers/global-data-provider', () => ({
    useGlobalData: () => ({config: mockConfig()})
}));

describe('useUpgradeUrl', () => {
    const upgradeUrlFor = (billing?: Record<string, string>) => {
        mockConfig.mockReturnValue({hostSettings: billing ? {billing} : {}});
        return renderHook(() => useUpgradeUrl()).result.current;
    };

    it('sends people to Ghost(Pro) billing when the host has not configured anything', () => {
        expect(upgradeUrlFor()).toBe('/pro');
        expect(upgradeUrlFor({})).toBe('/pro');
    });

    // hostSettings holds an href, updateRoute takes a route
    it('turns a hash href into a route', () => {
        expect(upgradeUrlFor({upgradeUrl: '#/pro/billing/plans'})).toBe('/pro/billing/plans');
    });

    it('leaves an absolute billing URL alone', () => {
        expect(upgradeUrlFor({upgradeUrl: 'https://billing.example.com/upgrade'})).toBe('https://billing.example.com/upgrade');
    });

    it('leaves a route without a hash alone', () => {
        expect(upgradeUrlFor({upgradeUrl: '/billing'})).toBe('/billing');
    });
});
