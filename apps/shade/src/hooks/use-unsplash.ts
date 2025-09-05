import {useInfiniteQuery} from '@tanstack/react-query';
import {useCallback, useMemo} from 'react';

const API_URL = 'https://api.unsplash.com';
const API_VERSION = 'v1';
const APPLICATION_ID = '8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980';

export interface UnsplashPhoto {
    id: string;
    width: number;
    height: number;
    color: string;
    description: string | null;
    alt_description: string | null;
    urls: {
        raw: string;
        full: string;
        regular: string;
        small: string;
        thumb: string;
    };
    links: {
        self: string;
        html: string;
        download: string;
        download_location: string;
    };
    user: {
        id: string;
        username: string;
        name: string;
        first_name: string;
        last_name: string;
        links: {
            self: string;
            html: string;
        };
    };
    ratio?: number; // Added by our code
}

export interface UnsplashSearchResponse {
    total: number;
    total_pages: number;
    results: UnsplashPhoto[];
}

export interface UnsplashPhotoResponse extends UnsplashPhoto {}

interface UnsplashApiResponse {
    data: UnsplashPhoto[];
    nextPage: number | null;
    hasNextPage: boolean;
}

const makeUnsplashRequest = async (url: string): Promise<Response> => {
    const headers = {
        Authorization: `Client-ID ${APPLICATION_ID}`,
        'Accept-Version': API_VERSION,
        'App-Pragma': 'no-cache',
        'X-Unsplash-Cache': 'true'
    };

    const response = await fetch(url, {headers});
    
    if (!response.ok) {
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
            throw new Error('Unsplash API rate limit reached, please try again later.');
        }
        throw new Error(`Error ${response.status}: Uh-oh! Trouble reaching the Unsplash API`);
    }
    
    return response;
};

const fetchUnsplashPhotos = async ({pageParam = 1, queryKey}: any): Promise<UnsplashApiResponse> => {
    const [, searchTerm] = queryKey;
    
    let url: string;
    if (searchTerm) {
        url = `${API_URL}/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=30&page=${pageParam}`;
    } else {
        url = `${API_URL}/photos?per_page=30&page=${pageParam}`;
    }

    const response = await makeUnsplashRequest(url);
    const data = await response.json();
    
    // Handle search response vs direct photos response
    const photos = data.results || data;
    const processedPhotos = photos.map((photo: UnsplashPhoto) => ({
        ...photo,
        ratio: photo.height / photo.width
    }));

    // Extract pagination info
    const linkHeader = response.headers.get('link');
    let nextPage: number | null = null;
    let hasNextPage = false;

    if (linkHeader) {
        const linkRegex = /<([^>]+)>;\s*rel="next"/;
        const match = linkHeader.match(linkRegex);
        if (match) {
            const nextUrl = new URL(match[1]);
            nextPage = parseInt(nextUrl.searchParams.get('page') || '1');
            hasNextPage = true;
        }
    } else if (searchTerm && data.total_pages && pageParam < data.total_pages) {
        nextPage = pageParam + 1;
        hasNextPage = true;
    } else if (!searchTerm && photos.length === 30) {
        // For non-search requests, if we got 30 photos, there might be more
        nextPage = pageParam + 1;
        hasNextPage = true;
    }

    return {
        data: processedPhotos,
        nextPage,
        hasNextPage
    };
};

export const useUnsplashPhotos = (searchTerm: string = '') => {
    //const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
        refetch
    } = useInfiniteQuery({
        queryKey: ['unsplash-photos', searchTerm],
        queryFn: fetchUnsplashPhotos,
        initialPageParam: 1,
        getNextPageParam: lastPage => lastPage.nextPage,
        enabled: true,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Flatten all photos from all pages
    const allPhotos = useMemo(() => {
        return data?.pages.flatMap(page => page.data) || [];
    }, [data]);

    // Trigger download for Unsplash API compliance
    const triggerDownload = useCallback(async (photo: UnsplashPhoto) => {
        if (photo.links.download_location) {
            try {
                await makeUnsplashRequest(photo.links.download_location);
            } catch (error) {
                // Ignore download tracking errors
                console.warn('Failed to trigger download tracking:', error);
            }
        }
    }, []);

    // Retry last request
    const retry = useCallback(() => {
        refetch();
    }, [refetch]);

    return {
        photos: allPhotos,
        isLoading,
        isError,
        error: error?.message,
        hasNextPage,
        isFetchingNextPage,
        loadNextPage: fetchNextPage,
        triggerDownload,
        retry
    };
};
