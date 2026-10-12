import { useEffect } from 'react';
import { useDocsBot } from '@tryghost/admin-x-framework';
import { DocsBotSupportTicketModal } from './docsbot-support-ticket-modal';

export function DocsBotWidgetHost() {
  const {
    isAvailable,
    mountWidget,
    unmountWidget,
    supportRequest,
    clearSupportRequest,
    addBotMessage,
    openWidget,
  } = useDocsBot();

  useEffect(() => {
    if (!isAvailable) {
      return;
    }
    mountWidget();
    return unmountWidget;
  }, [isAvailable, mountWidget, unmountWidget]);

  if (!supportRequest) {
    return null;
  }

  return (
    <DocsBotSupportTicketModal
      addBotMessage={addBotMessage}
      openWidget={openWidget}
      supportRequest={supportRequest}
      open
      onOpenChange={(open) => {
        if (!open) {
          clearSupportRequest();
        }
      }}
    />
  );
}
