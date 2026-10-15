import { useEffect } from 'react';
import { useDocsBot } from '@tryghost/admin-x-framework';
import { SupportTicketModal } from './support-ticket-modal';
import {
  DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE,
  toSupportTicketDraft,
} from './docsbot-support-ticket';

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

  const onSent = async () => {
    try {
      await addBotMessage(DOCSBOT_SUPPORT_TICKET_THANKS_MESSAGE);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DocsBot] Failed to add confirmation message:', error);
    }
    void openWidget();
  };

  return (
    <SupportTicketModal
      draft={toSupportTicketDraft(supportRequest)}
      open
      onOpenChange={(open) => {
        if (!open) {
          clearSupportRequest();
        }
      }}
      onSent={() => void onSent()}
    />
  );
}
