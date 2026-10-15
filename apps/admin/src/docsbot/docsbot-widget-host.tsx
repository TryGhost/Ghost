import { useEffect } from 'react';
import { useDocsBot } from './use-docsbot';
import { SupportRequestModal } from '@/support-request-modal';

const THANKS_MESSAGE =
  'Thanks — your support request has been sent. Our team will follow up by email.';

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
      await addBotMessage(THANKS_MESSAGE);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DocsBot] Failed to add confirmation message:', error);
    }
    void openWidget();
  };

  return (
    <SupportRequestModal
      draft={supportRequest}
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
