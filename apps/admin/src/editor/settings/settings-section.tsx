import type { ReactNode } from 'react';
import { Separator } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';

/** One block of the settings panel, with the rule that closes it. */
export function SettingsSection({ children }: { children: ReactNode }) {
  return (
    <>
      <Stack className="px-5 py-4" gap="sm">
        {children}
      </Stack>
      <Separator />
    </>
  );
}
