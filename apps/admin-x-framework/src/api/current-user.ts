import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { apiUrl, useFetchApi } from '../utils/api/fetch-api';
import { SETTINGS_BOOTSTRAP_QUERY_SCOPE } from '../utils/api/query-scopes';
import { withQueryErrorPolicy } from '../utils/api/query-error-policy';
import { UsersResponseType } from './users';

export const usersDataType = 'UsersResponseType';

const currentUserUrl = apiUrl('/users/me/', { include: 'roles' });
export const currentUserQueryKey = [usersDataType, currentUserUrl] as const;

export const useCurrentUserQueryOptions = () => {
  const fetchApi = useFetchApi();

  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: (context) =>
      withQueryErrorPolicy(context, true, () => fetchApi<UsersResponseType>(currentUserUrl)),
    meta: {
      defaultErrorHandler: true,
      errorResetScope: SETTINGS_BOOTSTRAP_QUERY_SCOPE,
    },
  });
};

// Special case where we can't use createQuery because this is used by
// usePermissions, which is then used by createQuery
export const useCurrentUser = () => {
  const currentUserQueryOptions = useCurrentUserQueryOptions();

  const result = useQuery({
    ...currentUserQueryOptions,
    select: (data) => data.users[0],
  });

  return result;
};

// Suspense sibling of useCurrentUser on the exact same cache entry; loading
// suspends and errors throw to the nearest boundary.
export const useCurrentUserSuspense = () => {
  const currentUserQueryOptions = useCurrentUserQueryOptions();

  const result = useSuspenseQuery({
    ...currentUserQueryOptions,
    select: (data) => data.users[0],
  });

  if (result.error && !result.isFetching) {
    throw result.error;
  }

  return result;
};
