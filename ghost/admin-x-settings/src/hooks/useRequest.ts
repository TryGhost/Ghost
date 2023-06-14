import {useCallback, useEffect, useState} from 'react';

type FetcherFunction<T> = () => Promise<T>;

export function useRequest<T>(fetcher: FetcherFunction<T>) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const responseData = await fetcher();
            setData(responseData);
        } catch (err: any) {
            setError(err?.message);
        } finally {
            setIsLoading(false);
        }
    }, [fetcher]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refetch = async () => {
        setIsLoading(true);
        await fetchData();
    };

    return {
        data,
        error,
        isLoading,
        refetch
    };
}
