import { useEffect } from 'react';
import { useDocsBot } from './use-docsbot';
import { SupportRequestModal } from '@/support-request-modal';

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
      await openWidget();

      const added = await addBotMessage(
        'Thanks - your support request has been sent. Our team will follow up by email within 48 hours.',
      );

      if (!added) {
        // eslint-disable-next-line no-console
        console.error('[DocsBot] Failed to add confirmation message');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DocsBot] Failed to add confirmation message:', error);
    }
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
