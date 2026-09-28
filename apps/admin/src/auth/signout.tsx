import { useEffect, useRef } from 'react';
import { useAuthClient } from './client/auth-client';
import { reloadAdmin } from './reload';
import { takeSigninRedirect } from './signin-redirect';

export default function Signout() {
  const authClient = useAuthClient();
  const started = useRef(false);

  useEffect(() => {
    // StrictMode mounts effects twice; one sign out is enough.
    if (started.current) {
      return;
    }
    started.current = true;

    const signOut = async () => {
      try {
        await authClient.signOut();
      } catch {
        // Already signed out, or unreachable: the reload shows which.
      }
      takeSigninRedirect();
      reloadAdmin('/signin');
    };
    void signOut();
  }, [authClient]);

  return null;
}
