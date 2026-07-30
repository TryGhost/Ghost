import {renderHook} from '@testing-library/react';
import {useFeatureFlag} from '../../../src/hooks/use-feature-flag';

vi.mock('../../../src/api/config', () => ({
    useBrowseConfig: vi.fn()
}));

import {useBrowseConfig} from '../../../src/api/config';

const mockUseBrowseConfig = useBrowseConfig as any;

const withLabs = (labs: Record<string, unknown>) => ({
    data: {config: {labs}}
});

describe('useFeatureFlag', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns true when the flag is explicitly true', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({myFlag: true}));

        const {result} = renderHook(() => useFeatureFlag('myFlag'));

        expect(result.current).toBe(true);
    });

    it('returns false when the flag is false', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({myFlag: false}));

        const {result} = renderHook(() => useFeatureFlag('myFlag'));

        expect(result.current).toBe(false);
    });

    it('returns false when the flag is absent', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({}));

        const {result} = renderHook(() => useFeatureFlag('myFlag'));

        expect(result.current).toBe(false);
    });

    it('returns false when config has no data yet', () => {
        mockUseBrowseConfig.mockReturnValue({data: undefined});

        const {result} = renderHook(() => useFeatureFlag('myFlag'));

        expect(result.current).toBe(false);
    });

    it('returns false when the flag value is truthy but not boolean true', () => {
        mockUseBrowseConfig.mockReturnValue(withLabs({myFlag: 'true'}));

        const {result} = renderHook(() => useFeatureFlag('myFlag'));

        expect(result.current).toBe(false);
    });
});
