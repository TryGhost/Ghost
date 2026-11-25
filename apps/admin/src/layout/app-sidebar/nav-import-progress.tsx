import { Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { importProgressLabel, isImportFinished, useImportProgress } from '@/content-import/api';
import { useSettingsReturnToState } from '@/layout/settings-navigation';
import { NavMenuItem } from './nav-menu-item';

export function NavImportProgress() {
  const { imports } = useImportProgress();
  const state = useSettingsReturnToState();
  const progress = imports.find((item) => !isImportFinished(item.status));
  if (!progress) {
    return null;
  }
  return (
    <NavMenuItem>
      <NavMenuItem.Link state={state} to="settings/migration">
        <LucideIcon.Import />
        <NavMenuItem.Label className="grow">Import progress</NavMenuItem.Label>
        <Text as="span" className="shrink-0 tabular-nums" size="sm" tone="secondary">
          {importProgressLabel(progress)}
        </Text>
      </NavMenuItem.Link>
    </NavMenuItem>
  );
}
