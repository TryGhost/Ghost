import {useEffect, useState} from 'react';

export interface DataService<Data> {
    data: Data[];
    update: (...data: Data[]) => Promise<void>;
    create: (data: Partial<Data>) => Promise<void>;
}

// eslint-disable-next-line no-unused-vars
type BulkEditFunction<Data, DataKey extends string> = (newData: Data[]) => Promise<{ [k in DataKey]: Data[] }>
// eslint-disable-next-line no-unused-vars
type AddFunction<Data, DataKey extends string> = (newData: Partial<Data>) => Promise<{ [k in DataKey]: Data[] }>

const useDataService = <Data extends { id: string }, DataKey extends string>({key, browse, edit, add}: {
    key: DataKey
    // eslint-disable-next-line no-unused-vars
    browse: () => Promise<{ [k in DataKey]: Data[] }>
    // eslint-disable-next-line no-unused-vars
    edit: BulkEditFunction<Data, DataKey>
    add: AddFunction<Data, DataKey>
}): DataService<Data> => {
    const [data, setData] = useState<Data[]>([]);

    useEffect(() => {
        browse().then((response) => {
            setData(response[key]);
        });
    }, [browse, key]);

    const update = async (...newData: Data[]) => {
        const response = await edit(newData);
        setData(data.map((item) => {
            const replacement = response[key].find(newItem => newItem.id === item.id);
            return replacement || item;
        }));
    };

    const create = async (newData: Partial<Data>) => {
        const response = await add(newData);
        setData([...data, response[key][0]]);
    };

    return {data, update, create};
};

export default useDataService;

// Utility for APIs which edit one object at a time
export const bulkEdit = <Data extends { id: string }, DataKey extends string>(
    key: DataKey,
    // eslint-disable-next-line no-unused-vars
    updateOne: (data: Data) => Promise<{ [k in DataKey]: Data[] }>
): BulkEditFunction<Data, DataKey> => {
    return async (newData: Data[]) => {
        const response = await Promise.all(newData.map(updateOne));

        return {
            [key]: response.reduce((all, current) => all.concat(current[key]), [] as Data[])
        // eslint-disable-next-line no-unused-vars
        } as { [k in DataKey]: Data[] };
    };
};

export const placeholderDataService = {data: [], update: async () => {}, create: async () => {}};
