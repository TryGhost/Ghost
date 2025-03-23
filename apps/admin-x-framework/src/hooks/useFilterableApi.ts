import {useRef} from 'react';
import {apiUrl, useFetchApi} from '../utils/api/fetchApi';
import {Meta} from '../utils/api/hooks';

const escapeNqlString = (value: string) => {
    return '\'' + value.replace(/'/g, '\\\'') + '\'';
};

const useFilterableApi = <
    Data extends {id: string} & {[k in FilterKey]: string} & {[k: string]: unknown},
    ResponseKey extends string = string,
    FilterKey extends string = string
>({path, filterKey, responseKey, limit = 20}: {
    path: string
    filterKey: FilterKey
    responseKey: ResponseKey
    limit?: number
}) => {
    const fetchApi = useFetchApi();

    const result = useRef<{
        data?: Data[];
        allLoaded?: boolean;
        lastInput?: string;
    }>({});

    const loadData = async (input: string) => {
        if ((result.current.allLoaded || result.current.lastInput === input) && result.current.data) {
            return result.current.data.filter(item => item[filterKey]?.toLowerCase().includes(input.toLowerCase()));
        }

        const response = await fetchApi<{meta?: Meta} & {[k in ResponseKey]: Data[]}>(apiUrl(path, {
            filter: input ? `${filterKey}:~${escapeNqlString(input)}` : '',
            limit: limit.toString()
        }));

        result.current.data = response[responseKey];
        result.current.allLoaded = !input && !response.meta?.pagination.next;
        result.current.lastInput = input;

        return response[responseKey];
    };

    const loadInitialValues = async (values: string[], key: string) => {
        await loadData('');

        const data = [...(result.current.data || [])];
        const missingValues = values.filter(value => !result.current.data?.find(item => item[key] === value));

        if (missingValues.length) {
            const additionalData = await fetchApi<{meta?: Meta} & {[k in ResponseKey]: Data[]}>(apiUrl(path, {
                filter: `${key}:[${missingValues.join(',')}]`,
                limit: 'all'
            }));

            data.push(...additionalData[responseKey]);
        }

        return values.map(value => data.find(item => item[key] === value)!);
    };

    return {
        loadData,
        loadInitialValues
    };
};

export default useFilterableApi;
