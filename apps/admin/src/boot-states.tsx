import logoLoaderUrl from '@/assets/videos/logo-loader.mp4';
import { reloadAdmin } from '@/auth/api';
import { useLocation } from '@tryghost/admin-x-framework';
import { getErrorMessage } from '@tryghost/admin-x-framework/errors';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';

/** The admin's loading screen until it knows who is signed in and who serves sign in. */
export function BootLoader() {
  return (
    <Stack
      align="center"
      aria-label="Loading Ghost Admin"
      className="h-full pb-[8vh]"
      justify="center"
      role="status"
    >
      <video
        aria-hidden="true"
        className="size-[100px]"
        height={100}
        preload="metadata"
        width={100}
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={logoLoaderUrl} type="video/mp4" />
      </video>
    </Stack>
  );
}

/** Replaces the admin when the signed-in user can't be read for a reason other than signing out. */
export function BootError({ error }: { error: Error }) {
  const { pathname, search } = useLocation();

  return (
    <Stack
      align="center"
      className="h-full px-4 pb-[8vh] text-center"
      justify="center"
      role="alert"
    >
      <Text tone="secondary">{getErrorMessage(error, error.message)}</Text>
      {/* Reloads rather than refetching so the hidden Ember app boots again as well. */}
      <Button variant="outline" onClick={() => reloadAdmin(`${pathname}${search}`)}>
        Retry
      </Button>
    </Stack>
  );
}
