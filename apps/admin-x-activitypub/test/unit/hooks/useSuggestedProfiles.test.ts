import {Mock, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import type {UseQueryResult} from '@tanstack/react-query';

import * as useActivityPubQueries from '../../../src/hooks/useActivityPubQueries';
import useSuggestedProfiles, {SUGGESTED_HANDLES} from '../../../src/hooks/useSuggestedProfiles';
import type{Profile} from '../../../src/api/activitypub';

vi.mock('../../../src/hooks/useActivityPubQueries');

describe('useSuggestedProfiles', function () {
    let mockUpdateSuggestedProfile: Mock;

    beforeEach(function () {
        mockUpdateSuggestedProfile = vi.fn();

        vi.mocked(useActivityPubQueries.useSuggestedProfiles).mockImplementation((handle, handles) => {
            // We expect the handle to be 'index', throw if anything else
            if (handle !== 'index') {
                throw new Error(`Expected handle to be: [index], got: [${handle}]`);
            }

            // Return the mocked query result making sure that the data is the
            // same as the handles passed in. For the purposes of this test,
            // we don't need to test the internals of useSuggestedProfilesQuery
            return {
                suggestedProfilesQuery: {
                    data: handles,
                    isLoading: false
                } as unknown as UseQueryResult<Profile[], unknown>,
                updateSuggestedProfile: mockUpdateSuggestedProfile
            };
        });
    });

    it('should return the default number of suggested profiles', function () {
        const {result} = renderHook(() => useSuggestedProfiles());

        // Check that the correct number of suggested profiles are returned
        expect(result.current.suggested.length).toEqual(3);

        // Check that the suggested profiles are in the SUGGESTED_HANDLES array
        result.current.suggested.forEach((suggested) => {
            expect(SUGGESTED_HANDLES).toContain(suggested);
        });
    });

    it('should return the specified number of suggested profiles', function () {
        const {result} = renderHook(() => useSuggestedProfiles(5));

        // Assert that the correct number of suggested profiles are returned
        expect(result.current.suggested.length).toEqual(5);

        // Assert that the suggested profiles are in the SUGGESTED_HANDLES array
        result.current.suggested.forEach((suggested) => {
            expect(SUGGESTED_HANDLES).toContain(suggested);
        });
    });

    it('should return a loading state', function () {
        const {result} = renderHook(() => useSuggestedProfiles());

        expect(result.current.isLoadingSuggested).toEqual(false);
    });

    it('should return a function to update a suggested profile', function () {
        const {result} = renderHook(() => useSuggestedProfiles());

        expect(result.current.updateSuggestedProfile).toEqual(mockUpdateSuggestedProfile);
    });
});
