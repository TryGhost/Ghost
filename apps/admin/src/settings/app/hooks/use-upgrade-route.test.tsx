import {renderHook} from '@testing-library/react';
import {useUpgradeRoute} from '@/settings/app/hooks/use-upgrade-route';

const mockConfig = vi.fn();

vi.mock('@/settings/app/components/providers/global-data-provider', () => ({
    useGlobalData: () => ({config: mockConfig()})
}));

describe('useUpgradeRoute', () => {
    const routeFor = (billing?: Record<string, string>) => {
        mockConfig.mockReturnValue({hostSettings: billing ? {billing} : {}});
        return renderHook(() => useUpgradeRoute()).result.current;
    };

    it('sends people to Ghost(Pro) billing when the host has not configured anything', () => {
        expect(routeFor()).toBe('/pro');
        expect(routeFor({})).toBe('/pro');
    });

    // hostSettings holds an href, updateRoute takes a route
    it('turns a hash href into a route', () => {
        expect(routeFor({upgradeUrl: '#/pro/billing/plans'})).toBe('/pro/billing/plans');
    });

    it('leaves an absolute billing URL alone', () => {
        expect(routeFor({upgradeUrl: 'https://billing.example.com/upgrade'})).toBe('https://billing.example.com/upgrade');
    });

    it('leaves a route without a hash alone', () => {
        expect(routeFor({upgradeUrl: '/billing'})).toBe('/billing');
    });
});
