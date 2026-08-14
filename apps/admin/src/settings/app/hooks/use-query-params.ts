import {useSearchParams} from '@tryghost/admin-x-framework';

const useQueryParams = () => {
    const [searchParams] = useSearchParams();

    const getParam = (key: string) => {
        return searchParams.get(key);
    };

    return {
        getParam
    };
};

export default useQueryParams;
