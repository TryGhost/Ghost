import { page } from 'vitest/browser';
import * as sel from '@tryghost/test-data/selectors/auth';

/** Auth screen locators and gestures for acceptance specs; no assertions. */
export const authScreen = {
  heading: (name: string) => page.getByRole('heading', { name }),
  emailInput: () => page.getByLabelText(sel.emailLabel, { exact: true }),
  passwordInput: () => page.getByLabelText(sel.passwordLabel, { exact: true }),
  signInButton: () => page.getByRole('button', { name: sel.signInButton }),
  forgotButton: () => page.getByRole('button', { name: sel.forgotButton }),
  codeInput: () => page.getByLabelText(sel.verificationCodeLabel),
  verifyButton: () => page.getByRole('button', { name: sel.verifyButton }),
  resendButton: () => page.getByRole('button', { name: sel.resendButton }),
  newPasswordInput: () => page.getByLabelText(sel.newPasswordLabel, { exact: true }),
  confirmPasswordInput: () => page.getByLabelText(sel.confirmPasswordLabel),
  saveNewPasswordButton: () => page.getByRole('button', { name: sel.saveNewPasswordButton }),
  fullNameInput: () => page.getByLabelText(sel.fullNameLabel),
  createAccountButton: () => page.getByRole('button', { name: sel.createAccountButton }),
  siteTitleInput: () => page.getByLabelText(sel.siteTitleLabel),
  startPublishingButton: () => page.getByRole('button', { name: sel.startPublishingButton }),
  retryButton: () => page.getByRole('button', { name: sel.retryButton }),
  text: (text: string | RegExp) => page.getByText(text, { exact: typeof text === 'string' }),

  async signIn(email: string, password: string): Promise<void> {
    await authScreen.emailInput().fill(email);
    await authScreen.passwordInput().fill(password);
    await authScreen.signInButton().click();
  },
};
