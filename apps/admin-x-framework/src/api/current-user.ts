import {useQuery} from '@tanstack/react-query';
import {useEffect} from 'react';
import useHandleError from '../hooks/use-handle-error';
import {apiUrl, useFetchApi} from '../utils/api/fetch-api';
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
        select: data => data.users[0],
        // Signed-out state: every createQuery subscribes to this query via
        // usePermission, so a screen full of queries mounting against the
        // errored (403) bootstrap query must not retrigger it — the default
        // retryOnMount refetch caused an infinite mount/refetch/unmount loop
        // on the React auth screens. Auth flows do a full reload after login,
        // which refetches this naturally.
        retryOnMount: false
    });

    useEffect(() => {
        if (result.error) {
            handleError(result.error);
        }
    }, [handleError, result.error]);

    return result;
};
