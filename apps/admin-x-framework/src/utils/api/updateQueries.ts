import {InfiniteData} from '@tanstack/react-query';

export const insertToQueryCache = <ResponseData>(field: string, recordsToInsert?: (response: ResponseData) => unknown[]) => {
    return (newData: ResponseData, currentData: unknown) => {
        if (!currentData) {
            return currentData;
        }

        const getRecords = recordsToInsert || ((response: ResponseData) => (response as Record<string, unknown[]>)[field]);

        if (typeof currentData === 'object' && 'pages' in currentData) {
            const {pages} = currentData as InfiniteData<ResponseData>;
            const lastPage = pages[pages.length - 1];
            return {
                ...currentData,
                pages: pages.slice(0, -1).concat({
                    ...lastPage,
                    [field]: (lastPage as Record<string, unknown[]>)[field].concat(getRecords(newData))
                })
            };
        }

        return {
            ...currentData,
            [field]: (currentData as Record<string, unknown[]>)[field].concat(getRecords(newData))
        };
    };
};

export const updateQueryCache = <ResponseData>(field: string, updatedRecords?: (response: ResponseData) => Record<string, unknown>) => {
    return (newData: ResponseData, currentData: unknown) => {
        if (!currentData) {
            return currentData;
        }

        const getRecords = updatedRecords || ((response: ResponseData) => {
            const records = (response as Record<string, {id: string}[]>)[field];

            return records.reduce((result, record) => ({...result, [record.id]: record}), {} as Record<string, unknown>);
        });

        const updated = getRecords(newData);

        if (typeof currentData === 'object' && 'pages' in currentData) {
            const {pages} = currentData as InfiniteData<ResponseData>;
            return {
                ...currentData,
                pages: pages.map(page => ({
                    ...page,
                    [field]: (page as Record<string, {id: string}[]>)[field].map(current => updated[current.id] || current)
                }))
            };
        }

        return {
            ...currentData,
            [field]: (currentData as Record<string, {id: string}[]>)[field].map(current => updated[current.id] || current)
        };
    };
};

export const deleteFromQueryCache = <ResponseData, Payload>(field: string, idsFromPayload?: (payload: Payload) => string[]) => {
    return (_: ResponseData, currentData: unknown, payload: Payload) => {
        if (!currentData) {
            return currentData;
        }

        const deletedIds = idsFromPayload?.(payload) || [payload as string];

        if (typeof currentData === 'object' && 'pages' in currentData) {
            const {pages} = currentData as InfiniteData<ResponseData>;
            return {
                ...currentData,
                pages: pages.map(page => ({
                    ...page,
                    [field]: (page as Record<string, {id: string}[]>)[field].filter(current => !deletedIds.includes(current.id))
                }))
            };
        }

        return {
            ...currentData,
            [field]: (currentData as Record<string, {id: string}[]>)[field].filter(current => !deletedIds.includes(current.id))
        };
    };
};
