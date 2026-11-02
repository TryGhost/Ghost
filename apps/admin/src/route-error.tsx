import { reloadAdmin } from '@/auth/api';
import { useLocation, useRouteError } from '@tryghost/admin-x-framework';
import { Button } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { isChunkLoadError } from './chunk-load-recovery';

/** Replaces a screen that failed with an offer to reload the admin at it. */
export function RouteError() {
  const error = useRouteError();
  const { pathname, search } = useLocation();

  return (
    <Stack
      align="center"
      className="h-full px-4 pb-[8vh] text-center"
      justify="center"
      role="alert"
    >
      <Text tone="secondary">
        {isChunkLoadError(error)
          ? "This screen didn't load. Check your connection and reload."
          : 'Something went wrong on this screen. Reload to try again.'}
      </Text>
      <Button variant="outline" onClick={() => reloadAdmin(`${pathname}${search}`)}>
        Reload
      </Button>
    </Stack>
  );
}
