import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import useHandleError from '../hooks/use-handle-error';
import { apiUrl, useFetchApi } from '../utils/api/fetch-api';
import { UsersResponseType } from './users';

export const usersDataType = 'UsersResponseType';

const currentUserUrl = apiUrl('/users/me/', { include: 'roles' });
export const currentUserQueryKey = [usersDataType, currentUserUrl] as const;

// Special case where we can't use createQuery because this is used by
// usePermissions, which is then used by createQuery
export const useCurrentUser = () => {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();

  const result = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => fetchApi<UsersResponseType>(currentUserUrl),
    select: (data) => data.users[0],
  });

  useEffect(() => {
    if (result.error) {
      handleError(result.error);
    }
  }, [handleError, result.error]);

  return result;
};

// Suspense sibling of useCurrentUser on the exact same cache entry; loading
// suspends and errors throw to the nearest boundary.
export const useCurrentUserSuspense = () => {
  const fetchApi = useFetchApi();

  return useSuspenseQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => fetchApi<UsersResponseType>(currentUserUrl),
    select: (data) => data.users[0],
  });
};
