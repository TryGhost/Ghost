import { useEffect } from 'react';
import { useDocsBot } from '@tryghost/admin-x-framework';

// Renders nothing itself — DocsBot mounts its own floating chat bubble into
// the DOM. This component only ties the widget lifecycle to the availability
// gate (helpChat labs flag + server config), so toggling the flag
// adds/removes the bubble without a reload.
export function DocsBotWidgetHost() {
  const { isAvailable, mountWidget, unmountWidget } = useDocsBot();

  useEffect(() => {
    if (!isAvailable) {
      return;
    }
    mountWidget();
    return unmountWidget;
  }, [isAvailable, mountWidget, unmountWidget]);

  return null;
}
