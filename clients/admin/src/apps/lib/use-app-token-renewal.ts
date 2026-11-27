import { useEffect } from 'react';
import { useCreateAppToken } from '@tryghost/admin-x-framework/api/app-installations';
import type { AppTokenHolder } from './app-token';

/**
 * Renews an app session's token while the app runs. Nothing is renewed while it isn't running,
 * such as while it isn't responding and Admin shows no frame; once it runs again, a token that
 * expired meanwhile is renewed at once. A renewal Ghost refuses ends the session the way a
 * revision change does.
 */
export function useAppTokenRenewal(
  holder: AppTokenHolder,
  {
    installation: { id, revision },
    running,
    onEnded,
  }: {
    installation: { id: string; revision: number };
    running: boolean;
    onEnded: () => void;
  },
) {
  const { mutateAsync: createToken } = useCreateAppToken();
  useEffect(() => {
    if (!running) {
      return;
    }
    holder.start({
      renew: async () => (await createToken({ id, revision })).app_tokens[0],
      onEnded,
    });
    return () => holder.stop();
  }, [holder, running, createToken, id, revision, onEnded]);
}
