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
        retryOnMount: false,
        // 4xx (signed out / forbidden) is definitive: no retry, the auth
        // screens should show immediately (and the loop fix above relies on
        // the query settling). Anything else (network drop, 5xx, a dev
        // server under load) MUST retry — this query decides authenticated
        // vs signed-out for the whole shell, and classifying a transient
        // failure as signed-out strands a logged-in user on the signin
        // screen with no recovery.
        retry: (failureCount, error) => {
            const status = (error as {response?: {status?: number}})?.response?.status;
            if (status && status >= 400 && status < 500) {
                return false;
            }
            return failureCount < 3;
        }
    });

    useEffect(() => {
        if (result.error) {
            handleError(result.error);
        }
    }, [handleError, result.error]);

    return result;
};
