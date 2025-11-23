import {useQuery} from '@tanstack/react-query';
import {useEffect} from 'react';
import useHandleError from '../hooks/useHandleError';
import {apiUrl, useFetchApi} from '../utils/api/fetchApi';
import {UsersResponseType} from './users';

export const usersDataType = 'UsersResponseType';

const currentUserUrl = apiUrl('/users/me/', {include: 'roles'});
export const currentUserQueryKey = [usersDataType, currentUserUrl] as const;

// Special case where we can't use createQuery because this is used by
// usePermissions, which is then used by createQuery
export const useCurrentUser = () => {
    const fetchApi = useFetchApi();
    const handleError = useHandleError();

    const result = useQuery({
        queryKey: currentUserQueryKey,
        queryFn: () => fetchApi<UsersResponseType>(currentUserUrl),
        select: data => data.users[0]
    });

    useEffect(() => {
        if (result.error) {
            handleError(result.error);
        }
    }, [handleError, result.error]);

    return result;
};
