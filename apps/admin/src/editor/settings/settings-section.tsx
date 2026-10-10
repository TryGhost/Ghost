import type { ReactNode } from 'react';
import { Stack } from '@tryghost/shade/primitives';
import type { SettingsPanelField } from './sections';

/** One block of the settings panel. */
export function SettingsSection({
  field,
  children,
}: {
  /** The field the block edits, which a refused save can take the writer to. */
  field?: SettingsPanelField;
  children: ReactNode;
}) {
  return (
    <Stack className="px-5 py-4" data-settings-field={field} gap="sm">
      {children}
    </Stack>
  );
}
