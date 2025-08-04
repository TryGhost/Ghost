// TODO: Remove this test file and the useEditLinks hook entirely. 
// Components should use useEditLinksApi() directly instead of this trivial wrapper.

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useEditLinks} from '@src/hooks/useEditLinks';

// Mock the underlying API hook since we're only testing the wrapper interface
vi.mock('@tryghost/admin-x-framework/api/links', () => ({
    useBulkEditLinks: () => ({
        mutateAsync: vi.fn(),
        isLoading: false
    })
}));

describe('useEditLinks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exposes the expected interface', () => {
        const {result} = renderHook(() => useEditLinks());
        
        expect(typeof result.current.editLinks).toBe('function');
        expect(typeof result.current.isEditLinksLoading).toBe('boolean');
    });
});