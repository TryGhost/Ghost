import { LucideIcon } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { NavMenuItem } from './nav-menu-item';

/** Marked for a host script that provides in-app support, which opens Help in the side panel. */
export function NavHelpItem() {
  const inAppSupport = useFeatureFlag('inAppSupport');

  return (
    <NavMenuItem>
      <NavMenuItem.Link
        data-ghost-help={inAppSupport ? '' : undefined}
        rel="noopener noreferrer"
        target="_blank"
        to="https://ghost.org/help?utm_source=admin&utm_campaign=help"
      >
        <LucideIcon.HelpCircle />
        <NavMenuItem.Label>Help</NavMenuItem.Label>
      </NavMenuItem.Link>
    </NavMenuItem>
  );
}
