import {QueryClient} from '@tanstack/react-query';

declare global {
    interface Window {
        adminXQueryClient?: QueryClient;
    }
}

const queryClient = window.adminXQueryClient || new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * (60 * 1000), // 5 mins
            cacheTime: 10 * (60 * 1000), // 10 mins
            // We have custom retry logic for specific errors in fetchApi()
            retry: false,
            networkMode: 'always'
        }
    }
});

if (!window.adminXQueryClient) {
    window.adminXQueryClient = queryClient;
}

export default queryClient;
