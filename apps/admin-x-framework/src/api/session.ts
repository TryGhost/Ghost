import { createMutation } from '../utils/api/hooks';

// The server replies 204 No Content on sign-out, so the mutation resolves with no data.
export const useDeleteSession = createMutation<void, null>({
  method: 'DELETE',
  path: () => '/session/',
});
