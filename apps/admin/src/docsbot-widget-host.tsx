import { useEffect } from 'react';
import { useDocsBot } from '@tryghost/admin-x-framework';

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
