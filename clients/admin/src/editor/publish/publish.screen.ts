import { page } from 'vitest/browser';
import {
  chooseDateButton,
  publicPreviewWarningDialog,
  publishAlreadySent,
  publishBackToSettings,
  publishConfirm,
  publishConfirmError,
  publishContinue,
  publishEmailSizeWarning,
  publishEmailErrorStep,
  publishFlowComplete,
  publishFlowConfirm,
  publishFlowModal,
  publishFlowOptions,
  publishFlowPreview,
  publishLimitsError,
  publishNewsletterSelect,
  publishRecipientFree,
  publishRecipientSegments,
  publishRecipientSpecific,
  publishRetryEmail,
  publishRetryError,
  publishRevertToDraft,
  publishScheduleDate,
  publishScheduleTime,
  publishSettingEmailRecipients,
  publishSettingPublishAt,
  publishSettingPublishType,
  tkReminderDialog,
  updateFlowModal,
  updateFlowConfirmation,
  updateFlowPreviousEmail,
  updateFlowTitle,
} from '@tryghost/test-data/selectors/editor';

const SETTINGS = {
  'publish-type': publishSettingPublishType,
  'email-recipients': publishSettingEmailRecipients,
  'publish-at': publishSettingPublishAt,
} as const;

/** Publish and update flow locators and gestures for acceptance specs; no assertions. */
export const publishScreen = {
  root: () => page.getByTestId(publishFlowModal),
  closeButton: () =>
    page.getByTestId(publishFlowModal).getByRole('button', { name: 'Close', exact: true }),
  options: () => page.getByTestId(publishFlowOptions),
  confirm: () => page.getByTestId(publishFlowConfirm),
  complete: () => page.getByTestId(publishFlowComplete),
  emailError: () => page.getByTestId(publishEmailErrorStep),
  /** The collapsed row's toggle button. */
  setting: (name: keyof typeof SETTINGS) => page.getByTestId(SETTINGS[name]).getByRole('button'),
  scheduleDate: () => page.getByTestId(publishScheduleDate),
  scheduleCalendarButton: () =>
    page
      .getByTestId(publishSettingPublishAt)
      .getByRole('button', { name: chooseDateButton, exact: true }),
  scheduleTime: () => page.getByTestId(publishScheduleTime),
  continueButton: () => page.getByTestId(publishContinue),
  previewButton: () => page.getByTestId(publishFlowPreview),
  newsletterSelect: () => page.getByTestId(publishNewsletterSelect),
  recipientFree: () => page.getByTestId(publishRecipientFree),
  recipientSpecific: () => page.getByTestId(publishRecipientSpecific),
  recipientSearch: () => page.getByTestId(publishRecipientSegments).getByRole('combobox'),
  /** A tier or label offered by the open recipient search. */
  recipientOption: (name: string) => page.getByRole('option', { name, exact: true }),
  confirmButton: () => page.getByTestId(publishConfirm),
  backToSettings: () => page.getByTestId(publishBackToSettings),
  confirmError: () => page.getByTestId(publishConfirmError),
  limitsError: () => page.getByTestId(publishLimitsError),
  emailSizeWarning: () => page.getByTestId(publishEmailSizeWarning),
  alreadySent: () => page.getByTestId(publishAlreadySent),
  retryEmailButton: () => page.getByTestId(publishRetryEmail),
  retryError: () => page.getByTestId(publishRetryError),
  checkRetryAvailability: () =>
    page
      .getByTestId(publishEmailErrorStep)
      .getByRole('button', { name: 'Check retry availability', exact: true }),
  revertToDraft: () => page.getByTestId(publishRevertToDraft),
  tkReminder: () => page.getByTestId(tkReminderDialog),
  publicPreviewWarning: () => page.getByTestId(publicPreviewWarningDialog),
  updateFlow: () => page.getByTestId(updateFlowModal),
  updateFlowCloseButton: () =>
    page.getByTestId(updateFlowModal).getByRole('button', { name: 'Close', exact: true }),
  updateFlowConfirmation: () => page.getByTestId(updateFlowConfirmation),
  updateFlowPreviousEmail: () => page.getByTestId(updateFlowPreviousEmail),
  updateFlowTitle: () => page.getByTestId(updateFlowTitle),
};
