import { render, fireEvent, getByTestId } from '../../../utils/test-utils';
import SigninPage from '../../../../src/components/pages/signin-page';
import { getSiteData } from '../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
  const { mockDoActionFn, ...utils } = render(<SigninPage />, {
    overrideContext: {
      member: null,
      ...overrides,
    },
  });

  let emailInput;
  let submitButton;
  let signupButton;

  try {
    emailInput = utils.getByLabelText(/email/i);
    submitButton = utils.queryByRole('button', { name: 'Continue' });
    signupButton = utils.queryByRole('button', { name: 'Sign up' });
  } catch (err) {
    // ignore
  }

  return {
    emailInput,
    submitButton,
    signupButton,
    mockDoActionFn,
    ...utils,
  };
};

describe('SigninPage', () => {
  test('renders', () => {
    const { emailInput, submitButton, signupButton, mockDoActionFn } = setup();

    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('autocomplete', 'username webauthn');
    expect(submitButton).toBeInTheDocument();
    expect(signupButton).toBeInTheDocument();
    expect(mockDoActionFn).toHaveBeenCalledWith('conditionalPasskeySignin');
  });

  test('renders passkey sign in as a secondary action after email sign in', () => {
    const originalPublicKeyCredential = window.PublicKeyCredential;
    window.PublicKeyCredential = class PublicKeyCredential {};

    try {
      const { submitButton, getByRole } = setup();
      const passkeyButton = getByRole('button', { name: 'Sign in with a passkey →' });

      expect(submitButton).toHaveClass('gh-portal-btn-primary');
      expect(passkeyButton).toHaveClass('gh-portal-btn');
      expect(passkeyButton).not.toHaveClass('gh-portal-btn-primary');
      expect(passkeyButton).toHaveStyle({ width: '100%' });
      expect(submitButton).toHaveStyle({ width: '100%' });
      expect(submitButton.compareDocumentPosition(passkeyButton)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    } finally {
      window.PublicKeyCredential = originalPublicKeyCredential;
    }
  });

  test('can call signin action with email', () => {
    const { emailInput, submitButton, mockDoActionFn } = setup();

    fireEvent.change(emailInput, { target: { value: 'member@example.com' } });
    expect(emailInput).toHaveValue('member@example.com');

    fireEvent.click(submitButton);
    expect(mockDoActionFn).toHaveBeenCalledWith('signin', { email: 'member@example.com' });
  });

  test('can call swithPage for signup', () => {
    const { signupButton, mockDoActionFn } = setup();

    fireEvent.click(signupButton);
    expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', { page: 'signup' });
  });

  describe('when members are disabled', () => {
    test('renders an informative message without starting passkey sign in', () => {
      const { mockDoActionFn } = setup({
        site: getSiteData({
          membersSignupAccess: 'none',
        }),
      });

      const message = getByTestId(document.body, 'members-disabled-notification-text');
      expect(message).toBeInTheDocument();
      expect(mockDoActionFn).not.toHaveBeenCalledWith('conditionalPasskeySignin');
    });
  });
});
