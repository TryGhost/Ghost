import { page } from 'vitest/browser';
import {
  publicPreviewWarningDialog,
  publishConfirmButton,
  publishCompleteNote,
  publishConfirmError,
  publishContinueButton,
  publishEmailErrorStep,
  publishFlowComplete,
  publishFlowConfirm,
  publishFlowModal,
  publishFlowOptions,
  publishRetryEmailButton,
  publishRevertToDraft,
  publishScheduleDate,
  publishSettingEmailRecipients,
  publishSettingPublishAt,
  publishSettingPublishType,
  tkReminderDialog,
  updateFlowModal,
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
  options: () => page.getByTestId(publishFlowOptions),
  confirm: () => page.getByTestId(publishFlowConfirm),
  complete: () => page.getByTestId(publishFlowComplete),
  completeNote: () => page.getByTestId(publishCompleteNote),
  emailError: () => page.getByTestId(publishEmailErrorStep),
  /** The collapsed row's toggle button. */
  setting: (name: keyof typeof SETTINGS) => page.getByTestId(SETTINGS[name]).getByRole('button'),
  scheduleDate: () => page.getByTestId(publishScheduleDate),
  continueButton: () => page.getByTestId(publishContinueButton),
  confirmButton: () => page.getByTestId(publishConfirmButton),
  confirmError: () => page.getByTestId(publishConfirmError),
  retryEmailButton: () => page.getByTestId(publishRetryEmailButton),
  revertToDraft: () => page.getByTestId(publishRevertToDraft),
  tkReminder: () => page.getByTestId(tkReminderDialog),
  publicPreviewWarning: () => page.getByTestId(publicPreviewWarningDialog),
  updateFlow: () => page.getByTestId(updateFlowModal),
  updateFlowPreviousEmail: () => page.getByTestId(updateFlowPreviousEmail),
  updateFlowTitle: () => page.getByTestId(updateFlowTitle),
};
