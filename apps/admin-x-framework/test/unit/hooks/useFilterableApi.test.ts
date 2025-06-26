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
        vi.clearAllMocks();
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

    it('filters cached data on subsequent calls with same input', async () => {
        const mockData: TestData[] = [
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'John Smith', email: 'john.smith@example.com'},
            {id: '3', name: 'Jane Doe', email: 'jane@example.com'}
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

        // First call - should make API request
        const firstResult = await result.current.loadData('');
        expect(firstResult).toEqual(mockData);
        expect(mockFetchApi).toHaveBeenCalledTimes(1);

        // Second call with filter - should filter cached data if all loaded
        const secondResult = await result.current.loadData('john');
        expect(secondResult).toEqual([
            {id: '1', name: 'John Doe', email: 'john@example.com'},
            {id: '2', name: 'John Smith', email: 'john.smith@example.com'}
        ]);
        expect(mockFetchApi).toHaveBeenCalledTimes(1); // No additional API call
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

        expect(mockFetchApi).toHaveBeenCalledTimes(2);
        expect(mockApiUrl).toHaveBeenNthCalledWith(2, '/users', {
            filter: 'id:[3]',
            limit: '100'
        });
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

        expect(mockFetchApi).toHaveBeenCalledTimes(1); // Only called once since no missing values
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

        expect(mockFetchApi).toHaveBeenCalledTimes(2);
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

        await result.current.loadData('');

        // When there's pagination, allLoaded should be false
        await result.current.loadData('test');
        
        // Should make a new API call since not all data is loaded
        expect(mockFetchApi).toHaveBeenCalledTimes(2);
    });
});