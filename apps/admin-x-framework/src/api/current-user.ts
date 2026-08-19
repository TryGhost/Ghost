import {useQuery} from '@tanstack/react-query';
import {useCallback, useEffect} from 'react';
import useHandleError from '../hooks/use-handle-error';
import {apiUrl, useFetchApi} from '../utils/api/fetch-api';
import {UsersResponseType} from './users';

export const usersDataType = 'UsersResponseType';

const currentUserUrl = apiUrl('/users/me/', {include: 'roles'});
export const currentUserQueryKey = [usersDataType, currentUserUrl] as const;

/**
 * Reads the current user straight from the API, leaving the query cache alone.
 *
 * Backs the query below, and serves a caller that needs the server's state as
 * the base of a read-modify-write (the user's preferences blob, for one)
 * without the displayed user flipping to a pre-write value while that write is
 * in flight.
 */
export const useFetchCurrentUser = () => {
    const fetchApi = useFetchApi();

    return useCallback(() => fetchApi<UsersResponseType>(currentUserUrl), [fetchApi]);
};

// Special case where we can't use createQuery because this is used by
// usePermissions, which is then used by createQuery
export const useCurrentUser = () => {
    const fetchCurrentUser = useFetchCurrentUser();
    const handleError = useHandleError();

    const result = useQuery({
        queryKey: currentUserQueryKey,
        queryFn: fetchCurrentUser,
        select: data => data.users[0]
    });

    useEffect(() => {
        if (result.error) {
            handleError(result.error);
        }
    }, [handleError, result.error]);

    return result;
};
