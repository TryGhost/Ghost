import React from 'react';
import {HttpResponse, QueryClientProvider, createMswHandlers, createTestQueryClient, http, server} from '../../src/test';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {createQuery} from '../../src/utils/api/hooks';

// Set up the test wrapper with QueryClientProvider
const wrapper = ({children}: {children: React.ReactNode}) => {
    const queryClient = createTestQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('MSW Integration Example', () => {
    // Reset mocks after each test
    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch data using MSW handlers', async () => {
        // Define the mock response for this test
        server.use(
            http.get('/ghost/api/admin/test/', () => {
                return HttpResponse.json({
                    test: {
                        id: '1',
                        name: 'Test Item'
                    }
                });
            })
        );
        
        // Create a query hook that will use the mocked endpoint
        const useTestQuery = createQuery({
            dataType: 'test',
            path: '/test/'
        });
        
        // Render the hook with the testing wrapper
        const {result} = renderHook(() => useTestQuery(), {wrapper});
        
        // Initially should be loading
        expect(result.current.isLoading).toBe(true);
        
        // Wait for the query to complete
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        
        // Check that we got the expected mocked data
        expect(result.current.data).toEqual({
            test: {
                id: '1',
                name: 'Test Item'
            }
        });
    });

    it('uses the createMswHandlers utility to generate handlers', async () => {
        // Define mock requests like in mockApi
        const mockRequests = {
            getTest: {
                method: 'GET',
                path: '/ghost/api/admin/test/',
                response: {
                    test: {
                        id: '2',
                        name: 'Another Test Item'
                    }
                }
            }
        };

        // Set up the MSW handlers from the mock requests
        server.use(...createMswHandlers(mockRequests));
        
        // Create a query hook
        const useTestQuery = createQuery({
            dataType: 'test',
            path: '/test/'
        });
        
        // Render the hook
        const {result} = renderHook(() => useTestQuery(), {wrapper});
        
        // Wait for the query to complete
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        
        // Check that we got the expected data
        expect(result.current.data).toEqual({
            test: {
                id: '2',
                name: 'Another Test Item'
            }
        });
    });
}); 