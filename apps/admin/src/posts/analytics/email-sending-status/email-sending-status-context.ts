import { createContext, useContext } from 'react';
import type { EmailSendingStatus } from '@tryghost/admin-x-framework/api/emails';

export interface EmailSendingStatusContextValue {
  enabled: boolean;
  status: EmailSendingStatus | undefined;
  isStatusLoading: boolean;
  isNewsletterDataHidden: boolean;
  newsletterDataHiddenReason: 'sending' | 'failed' | null;
  hasNewsletterAnalytics: boolean;
  hasUnknownDeliveryOutcome: boolean;
  isRetrying: boolean;
  retrySending: () => Promise<void>;
}

export const EmailSendingStatusContext = createContext<EmailSendingStatusContextValue | undefined>(
  undefined,
);

export const useEmailSendingStatusContext = (): EmailSendingStatusContextValue => {
  const context = useContext(EmailSendingStatusContext);
  if (!context) {
    throw new Error(
      'useEmailSendingStatusContext must be used within an EmailSendingStatusProvider',
    );
  }
  return context;
};
