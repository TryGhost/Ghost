import type { ReactNode } from 'react';
import { Stack } from '@tryghost/shade/primitives';

/** One block of the settings panel. */
export function SettingsSection({ children }: { children: ReactNode }) {
  return (
    <Stack className="px-5 py-4" gap="sm">
      {children}
    </Stack>
  );
}
