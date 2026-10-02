import { page } from 'vitest/browser';
import {
  chooseDateButton,
  publicPreviewWarningDialog,
  publishAlreadySent,
  publishBackToSettings,
  publishConfirm,
  publishCompleteNote,
  publishConfirmError,
  publishContinue,
  publishEmailErrorStep,
  publishFlowComplete,
  publishFlowConfirm,
  publishFlowModal,
  publishFlowOptions,
  publishFlowPreview,
  publishLimitsError,
  publishRecipientFree,
  publishRetryEmail,
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
  completeNote: () => page.getByTestId(publishCompleteNote),
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
  recipientFree: () => page.getByTestId(publishRecipientFree),
  confirmButton: () => page.getByTestId(publishConfirm),
  backToSettings: () => page.getByTestId(publishBackToSettings),
  confirmError: () => page.getByTestId(publishConfirmError),
  limitsError: () => page.getByTestId(publishLimitsError),
  alreadySent: () => page.getByTestId(publishAlreadySent),
  retryEmailButton: () => page.getByTestId(publishRetryEmail),
  revertToDraft: () => page.getByTestId(publishRevertToDraft),
  tkReminder: () => page.getByTestId(tkReminderDialog),
  publicPreviewWarning: () => page.getByTestId(publicPreviewWarningDialog),
  updateFlow: () => page.getByTestId(updateFlowModal),
  updateFlowConfirmation: () => page.getByTestId(updateFlowConfirmation),
  updateFlowPreviousEmail: () => page.getByTestId(updateFlowPreviousEmail),
  updateFlowTitle: () => page.getByTestId(updateFlowTitle),
};
