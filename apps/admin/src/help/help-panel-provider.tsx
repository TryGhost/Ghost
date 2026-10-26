import { type ReactNode, useMemo, useState } from 'react';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { hasHelpCenterKey } from './help-center';
import { HelpPanelContext } from './help-panel-context';

/*
 * Holds whether the Help panel is open, for the whole Admin layout. The panel
 * itself (help-panel.tsx) is placed beside the page by AdminLayout.
 *
 * Ghost(Pro) only: the panel exists to deflect Ghost(Pro) support tickets,
 * and its support form, account answers and billing are Ghost(Pro)'s. Other
 * sites (self-hosted) get no provider, so their Help items keep linking to the
 * help center as before (see useHelpPanel). Ghost(Pro) is told apart the way
 * Admin's billing screen is: hostSettings.billing.enabled in the config.
 *
 * Without the help center's API key (help-center.ts) there's nothing to show,
 * so Help also links out as before.
 */

export function HelpPanelProvider({ children }: { children: ReactNode }) {
  const { data: config } = useBrowseConfig();
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);

  if (!config?.config.hostSettings?.billing?.enabled || !hasHelpCenterKey()) {
    return children;
  }

  return <HelpPanelContext.Provider value={value}>{children}</HelpPanelContext.Provider>;
}
