import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import useHandleError from '../hooks/use-handle-error';
import { apiUrl, useFetchApi, type RequestOptions } from '../utils/api/fetch-api';
import { UsersResponseType } from './users';

export const usersDataType = 'UsersResponseType';

const currentUserUrl = apiUrl('/users/me/', { include: 'roles' });
export const currentUserQueryKey = [usersDataType, currentUserUrl] as const;

export interface CurrentUserOptions {
  /** Applies to a refetch this call site initiates, not to the shared cache entry. */
  requestOptions?: Pick<RequestOptions, 'sessionExpiryRedirect'>;
}

// Special case where we can't use createQuery because this is used by
// usePermissions, which is then used by createQuery
export const useCurrentUser = ({ requestOptions }: CurrentUserOptions = {}) => {
  const fetchApi = useFetchApi();
  const handleError = useHandleError();

  const result = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: () => fetchApi<UsersResponseType>(currentUserUrl, requestOptions),
    select: (data) => data.users[0],
  });

  useEffect(() => {
    if (result.error) {
      handleError(result.error);
    }
  }, [handleError, result.error]);

  return result;
};
