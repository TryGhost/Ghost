import {renderHook} from '@testing-library/react';
import useFilterableApi from '../../../src/hooks/useFilterableApi';

// Mock the fetchApi module
vi.mock('../../../src/utils/api/fetchApi', () => ({
    useFetchApi: vi.fn(),
    apiUrl: vi.fn()
}));

// Import the mocked modules
import * as fetchApiModule from '../../../src/utils/api/fetchApi';

// Get mocks without calling hooks at top level
const mockFetchApi = vi.fn();
const mockApiUrl = vi.fn();

// Override the mocked modules
vi.mocked(fetchApiModule.useFetchApi).mockReturnValue(mockFetchApi);
vi.mocked(fetchApiModule.apiUrl).mockImplementation(mockApiUrl);

interface TestData {
    id: string;
    name: string;
    email?: string;
    [key: string]: unknown;
}

describe('useFilterableApi', () => {
    beforeEach(() => {
        // Reset mock call history but keep implementations
        mockFetchApi.mockClear();
        mockApiUrl.mockClear();
        
        mockApiUrl.mockImplementation((path: any, params: any) => {
            const searchParams = new URLSearchParams(params);
            return `${path}?${searchParams.toString()}`;
        });
        // Set up fetchApi to return resolved promises by default
        mockFetchApi.mockResolvedValue({
            users: [],
            meta: {pagination: {next: null}}
        });
    });

    afterEach(() => {
        // Reset mock call history but keep implementations
        mockFetchApi.mockClear();
        mockApiUrl.mockClear();
    });

    it('loads data without filter', async () => {
        const mockData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'Jane Smith', email: 'jane@example.com'}
        ];

        mockFetchApi.mockResolvedValueOnce({
            users: mockData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        const data = await result.current.loadData('');

        expect(data).toEqual(mockData);
        expect(mockApiUrl).toHaveBeenCalledWith('/users', {
            filter: '',
            limit: '20'
        });
    });

    it('loads data with filter', async () => {
        const mockData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'}
        ];

        mockFetchApi.mockResolvedValueOnce({
            users: mockData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        const data = await result.current.loadData('John');

        expect(data).toEqual(mockData);
        expect(mockApiUrl).toHaveBeenCalledWith('/users', {
            filter: 'name:~\'John\'',
            limit: '20'
        });
    });

    it('escapes single quotes in filter values', async () => {
        const mockData: TestData[] = [];

        mockFetchApi.mockResolvedValueOnce({
            users: mockData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        await result.current.loadData('O\'Brien');

        expect(mockApiUrl).toHaveBeenCalledWith('/users', {
            filter: 'name:~\'O\\\'Brien\'',
            limit: '20'
        });
    });

    it('uses custom limit', async () => {
        const mockData: TestData[] = [];

        mockFetchApi.mockResolvedValueOnce({
            users: mockData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users',
            limit: 50
        }));

        await result.current.loadData('test');

        expect(mockApiUrl).toHaveBeenCalledWith('/users', {
            filter: 'name:~\'test\'',
            limit: '50'
        });
    });

    it('filters data correctly when searching', async () => {
        const mockData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'John Smith', email: 'john.smith@example.com'},
            {id: '3', name: 'Jane Doe', email: 'jane@example.com'}
        ];

        mockFetchApi.mockResolvedValue({
            users: mockData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        // Load all data first
        const allResults = await result.current.loadData('');
        expect(allResults).toEqual(mockData);

        // Filter for "john" - should return both John entries
        const filteredResults = await result.current.loadData('john');
        expect(filteredResults).toEqual([
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'John Smith', email: 'john.smith@example.com'}
        ]);
    });

    it('loads initial values', async () => {
        const allData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'Jane Smith', email: 'jane@example.com'}
        ];

        const specificData: TestData[] = [
            {id: '3', name: 'Bob Johnson', email: 'bob@example.com'}
        ];

        // First call for loadData('')
        mockFetchApi.mockResolvedValueOnce({
            users: allData,
            meta: {pagination: {next: null}}
        });

        // Second call for missing values
        mockFetchApi.mockResolvedValueOnce({
            users: specificData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        const initialValues = await result.current.loadInitialValues(['1', '3'], 'id');

        expect(initialValues).toEqual([
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '3', name: 'Bob Johnson', email: 'bob@example.com'}
        ]);
    });

    it('handles missing values in loadInitialValues', async () => {
        const allData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'}
        ];

        mockFetchApi.mockResolvedValue({
            users: allData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        const initialValues = await result.current.loadInitialValues(['1'], 'id');

        expect(initialValues).toEqual([
            {id: '1', name: 'John Doe', email: 'john@example.com'}
        ]);
    });

    it('handles case-insensitive filtering', async () => {
        const mockData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'jane smith', email: 'jane@example.com'}
        ];

        mockFetchApi.mockResolvedValueOnce({
            users: mockData,
            meta: {pagination: {next: null}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        // Load all data first
        await result.current.loadData('');
        
        // Filter with uppercase - should match lowercase
        const filteredData = await result.current.loadData('JANE');

        expect(filteredData).toEqual([
            {id: '2', name: 'jane smith', email: 'jane@example.com'}
        ]);
    });

    it('makes new API call when filter changes', async () => {
        const mockData1: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'}
        ];

        const mockData2: TestData[] = [
            {id: '2', name: 'Jane Smith', email: 'jane@example.com'}
        ];

        mockFetchApi
            .mockResolvedValueOnce({
                users: mockData1,
                meta: {pagination: {next: 'page2'}}
            })
            .mockResolvedValueOnce({
                users: mockData2,
                meta: {pagination: {next: null}}
            });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        // First call
        const firstResult = await result.current.loadData('John');
        expect(firstResult).toEqual(mockData1);

        // Second call with different filter
        const secondResult = await result.current.loadData('Jane');
        expect(secondResult).toEqual(mockData2);
    });

    it('handles pagination correctly', async () => {
        const mockData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'}
        ];

        mockFetchApi.mockResolvedValue({
            users: mockData,
            meta: {pagination: {next: 'page2'}}
        });

        const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
            path: '/users',
            filterKey: 'name',
            responseKey: 'users'
        }));

        const firstResult = await result.current.loadData('');
        expect(firstResult).toEqual(mockData);

        const secondResult = await result.current.loadData('test');
        expect(secondResult).toEqual(mockData);
    });

    describe('error handling', () => {
        it('handles network errors gracefully', async () => {
            const networkError = new Error('Network error');
            mockFetchApi.mockRejectedValueOnce(networkError);

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            await expect(result.current.loadData('test')).rejects.toThrow('Network error');
        });

        it('handles API errors with status codes', async () => {
            const apiError = new Error('Not found');
            mockFetchApi.mockRejectedValueOnce(apiError);

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            await expect(result.current.loadData('test')).rejects.toThrow('Not found');
        });

        it('handles malformed API responses', async () => {
            mockFetchApi.mockResolvedValueOnce({
                invalid: 'data structure'
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            const data = await result.current.loadData('');
            
            // The hook returns undefined when responseKey is not found
            expect(data).toBeUndefined();
        });

        it('handles null response data', async () => {
            mockFetchApi.mockResolvedValueOnce(null);

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            // This will throw because response[responseKey] on null throws
            await expect(result.current.loadData('')).rejects.toThrow();
        });

        it('handles errors in loadInitialValues', async () => {
            mockFetchApi.mockRejectedValueOnce(new Error('Load error'));

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            await expect(result.current.loadInitialValues(['1'], 'id')).rejects.toThrow('Load error');
        });
    });

    describe('concurrent requests', () => {
        it('handles concurrent loadData calls correctly', async () => {
            const mockData1: TestData[] = [
                {id: '1', name: 'First Result'}
            ];
            const mockData2: TestData[] = [
                {id: '2', name: 'Second Result'}
            ];

            mockFetchApi
                .mockResolvedValueOnce({
                    users: mockData1,
                    meta: {pagination: {next: null}}
                })
                .mockResolvedValueOnce({
                    users: mockData2,
                    meta: {pagination: {next: null}}
                });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            // Start two concurrent requests
            const promise1 = result.current.loadData('first');
            const promise2 = result.current.loadData('second');

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(result1).toEqual(mockData1);
            expect(result2).toEqual(mockData2);
        });

        it('handles rapid filter changes correctly', async () => {
            const mockData: TestData[] = [
                {id: '1', name: 'Test Result'}
            ];

            mockFetchApi.mockResolvedValue({
                users: mockData,
                meta: {pagination: {next: null}}
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            // Rapidly change filters
            const promise1 = result.current.loadData('test1');
            const promise2 = result.current.loadData('test2');
            const promise3 = result.current.loadData('test3');

            const results = await Promise.all([promise1, promise2, promise3]);

            // All calls should return data
            results.forEach((resultItem) => {
                expect(resultItem).toEqual(mockData);
            });
        });
    });

    describe('filter edge cases', () => {
        it('handles special characters in filter input', async () => {
            const mockData: TestData[] = [];

            mockFetchApi.mockResolvedValueOnce({
                users: mockData,
                meta: {pagination: {next: null}}
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            await result.current.loadData('test"ing\\stuff');

            expect(mockApiUrl).toHaveBeenCalledWith('/users', {
                filter: 'name:~\'test"ing\\stuff\'',
                limit: '20'
            });
        });

        it('handles Unicode characters in filter', async () => {
            const mockData: TestData[] = [];

            mockFetchApi.mockResolvedValueOnce({
                users: mockData,
                meta: {pagination: {next: null}}
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            await result.current.loadData('测试用户');

            expect(mockApiUrl).toHaveBeenCalledWith('/users', {
                filter: 'name:~\'测试用户\'',
                limit: '20'
            });
        });

        it('handles very long filter strings', async () => {
            const longString = 'a'.repeat(1000);
            const mockData: TestData[] = [];

            mockFetchApi.mockResolvedValueOnce({
                users: mockData,
                meta: {pagination: {next: null}}
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            await result.current.loadData(longString);

            expect(mockApiUrl).toHaveBeenCalledWith('/users', {
                filter: `name:~'${longString}'`,
                limit: '20'
            });
        });

        it('handles empty and whitespace-only filters', async () => {
            const mockData: TestData[] = [];

            mockFetchApi.mockResolvedValue({
                users: mockData,
                meta: {pagination: {next: null}}
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            // Test various empty/whitespace cases - should all return data
            const result1 = await result.current.loadData('');
            const result2 = await result.current.loadData('   ');
            const result3 = await result.current.loadData('\t\n');

            expect(result1).toEqual(mockData);
            expect(result2).toEqual(mockData);
            expect(result3).toEqual(mockData);
        });
    });

    describe('pagination edge cases', () => {
        it('handles missing pagination data', async () => {
            const mockData: TestData[] = [
                {id: '1', name: 'Test'}
            ];

            mockFetchApi.mockResolvedValueOnce({
                users: mockData
                // Missing meta/pagination
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            const data = await result.current.loadData('');
            
            expect(data).toEqual(mockData);
        });

        it('handles malformed pagination data', async () => {
            const mockData: TestData[] = [
                {id: '1', name: 'Test'}
            ];

            mockFetchApi.mockResolvedValueOnce({
                users: mockData,
                meta: {
                    pagination: 'invalid'
                }
            });

            const {result} = renderHook(() => useFilterableApi<TestData, 'users', 'name'>({
                path: '/users',
                filterKey: 'name',
                responseKey: 'users'
            }));

            const data = await result.current.loadData('');
            
            expect(data).toEqual(mockData);
        });
    });
});