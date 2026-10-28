import { expect } from 'vitest';
import { page, type Locator } from 'vitest/browser';
import {
  fakeAutomatedEmails,
  fakeNewsletters,
  fakeOffers,
  fakePosts,
} from '@test-utils/acceptance';

// What the email editor reads as it opens.
export const fakeEmailEditorData = () => {
  fakeAutomatedEmails([]);
  fakeNewsletters([]);
  fakeOffers([]);
  fakePosts([]);
};

export const emailEditor = () => page.getByRole('dialog', { name: 'Edit email', exact: true });
export const emailEditorBody = () => emailEditor().getByTestId('email-editor').getByRole('textbox');

export const minimizeEmailEditor = async () => {
  await emailEditor().getByRole('button', { name: 'Minimize editor' }).click();
  await expect(emailEditor()).toHaveCount(0);
};

// The subject is edited in the email editor, opened from the card's message preview.
export const editEmailSubject = async (card: Locator, subject: string) => {
  await card.getByRole('button', { name: 'Edit email content' }).click();
  await emailEditor().getByRole('textbox', { name: 'Subject line' }).fill(subject);
  await minimizeEmailEditor();
};
