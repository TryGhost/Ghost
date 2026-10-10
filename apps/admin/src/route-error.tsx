import { reloadAdmin } from '@/auth/api';
import { useLocation, useRouteError } from '@tryghost/admin-x-framework';
import { Button } from '@tryghost/shade/components';
import { ErrorPage, Stack, Text } from '@tryghost/shade/primitives';
import { isChunkLoadError } from './chunk-load-recovery';

/** Replaces a screen that failed; one whose code didn't load offers to reload the admin. */
export function RouteError() {
  const error = useRouteError();
  const { pathname, search } = useLocation();

  if (!isChunkLoadError(error)) {
    return <ErrorPage />;
  }

  return (
    <Stack
      align="center"
      className="h-full px-4 pb-[8vh] text-center"
      justify="center"
      role="alert"
    >
      <Text tone="secondary">This screen didn&apos;t load. Check your connection and reload.</Text>
      <Button variant="outline" onClick={() => reloadAdmin(`${pathname}${search}`)}>
        Reload
      </Button>
    </Stack>
  );
}
