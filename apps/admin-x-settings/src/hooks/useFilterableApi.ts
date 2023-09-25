import {Meta, apiUrl, useFetchApi} from '../utils/api/hooks';
import {useRef} from 'react';

const escapeNqlString = (value: string) => {
    return '\'' + value.replace(/'/g, '\\\'') + '\'';
};

const useFilterableApi = <
    Data extends {id: string} & {[Key in FilterKey]: string},
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

    return {
        loadData,

        loadInitialValues: async (ids: string[]) => {
            await loadData('');

            const data = [...(result.current.data || [])];
            const missingIds = ids.filter(id => !result.current.data?.find(({id: dataId}) => dataId === id));

            if (missingIds.length) {
                const additionalData = await fetchApi<{meta?: Meta} & {[k in ResponseKey]: Data[]}>(apiUrl(path, {
                    filter: `id:[${missingIds.join(',')}]`,
                    limit: 'all'
                }));

                data.push(...additionalData[responseKey]);
            }

            return ids.map(id => data.find(({id: dataId}) => dataId === id)!);
        }
    };
};

export default useFilterableApi;
