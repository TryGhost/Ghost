import {useQuery} from '@tanstack/react-query';
import {useEffect, useMemo} from 'react';
import useHandleError from '../hooks/useHandleError';
import {apiUrl, useFetchApi} from '../utils/api/fetchApi';
import {User} from './users';

export const usersDataType = 'UsersResponseType';

// Special case where we can't use createQuery because this is used by usePermissions, which is then used by createQuery
export const useCurrentUser = () => {
    const url = apiUrl('/users/me/', {include: 'roles'});
    const fetchApi = useFetchApi();
    const handleError = useHandleError();

    const result = useQuery({
        queryKey: [usersDataType, url],
        queryFn: () => fetchApi(url)
    });

    const data = useMemo<User | null>(() => result.data?.users?.[0], [result.data]);

    useEffect(() => {
        if (result.error) {
            handleError(result.error);
        }
    }, [handleError, result.error]);

    return {
        ...result,
        data
    };
};
