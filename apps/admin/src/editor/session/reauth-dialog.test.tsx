import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  type ErrorResponse,
  JSONError,
  UnauthorizedError,
  ValidationError,
} from '@tryghost/admin-x-framework/errors';
import { deferred } from '@/utils/deferred';
import { ReauthDialog } from './reauth-dialog';

const { addSession, verifySession } = vi.hoisted(() => ({
  addSession: vi.fn(),
  verifySession: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/api/session')>()),
  useAddSession: () => ({ mutateAsync: addSession }),
  useVerifySession: () => ({ mutateAsync: verifySession }),
}));

const EMAIL = 'owner@example.com';

function errorResponse(code: string, type: string, message: string): ErrorResponse {
  return {
    errors: [
      {
        code,
        type,
        message,
        context: null,
        details: null,
        ghostErrorCode: null,
        help: '',
        id: 'session-error',
        property: null,
      },
    ],
  };
}

function wrongPassword() {
  return new ValidationError(
    new Response(null, { status: 422 }),
    errorResponse('PASSWORD_INCORRECT', 'ValidationError', 'Your password is incorrect.'),
  );
}

function twoFactorRequired(code: '2FA_TOKEN_REQUIRED' | '2FA_NEW_DEVICE_DETECTED') {
  return new JSONError(
    new Response(null, { status: 403 }),
    errorResponse(code, 'Needs2FAError', 'User must verify session to login.'),
  );
}

function wrongCode() {
  return new UnauthorizedError(new Response(null, { status: 401 }), '');
}

function renderDialog(overrides: { open?: boolean } = {}) {
  const onSucceeded = vi.fn();
  const onAbandoned = vi.fn();
  render(
    <ReauthDialog
      email={EMAIL}
      open={overrides.open ?? true}
      onAbandoned={onAbandoned}
      onSucceeded={onSucceeded}
    />,
  );
  return { onSucceeded, onAbandoned };
}

/** Lets a settled mutation promise reach the component. */
async function settle() {
  await act(() => Promise.resolve());
}

async function signIn(password: string) {
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await settle();
}

async function verify(token: string) {
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: token } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  await settle();
}

async function reachCodeStep(code: '2FA_TOKEN_REQUIRED' | '2FA_NEW_DEVICE_DETECTED') {
  addSession.mockRejectedValueOnce(twoFactorRequired(code));
  const handle = renderDialog();
  await signIn('hunter22');
  await screen.findByLabelText('Verification code');
  return handle;
}

describe('ReauthDialog', () => {
  beforeEach(() => {
    addSession.mockReset();
    verifySession.mockReset();
  });

  it('renders nothing while closed', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks for the password with the email already filled in', () => {
    renderDialog();

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Are you still here?');
    expect(screen.getByLabelText('Email')).toHaveValue(EMAIL);
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('refuses an empty password without a request', async () => {
    const { onSucceeded } = renderDialog();

    await signIn('');

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a password');
    expect(addSession).not.toHaveBeenCalled();
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it('sends only the email and password to the session endpoint and reports success', async () => {
    addSession.mockResolvedValueOnce('Created');
    const { onSucceeded, onAbandoned } = renderDialog();

    await signIn('hunter22');

    expect(addSession).toHaveBeenCalledTimes(1);
    expect(addSession).toHaveBeenCalledWith({ username: EMAIL, password: 'hunter22' });
    expect(onSucceeded).toHaveBeenCalledTimes(1);
    expect(onAbandoned).not.toHaveBeenCalled();
  });

  it('holds the form while the sign-in is in flight', async () => {
    const pending = deferred<string>();
    addSession.mockReturnValueOnce(pending.promise);
    const { onSucceeded } = renderDialog();

    await signIn('hunter22');

    const submit = screen.getByRole('button', { name: 'Authenticating…' });
    expect(submit).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onSucceeded).not.toHaveBeenCalled();

    pending.resolve('Created');
    await settle();

    expect(onSucceeded).toHaveBeenCalledTimes(1);
  });

  it('names a wrong password and keeps asking', async () => {
    addSession.mockRejectedValueOnce(wrongPassword());
    const { onSucceeded } = renderDialog();

    await signIn('nope');

    expect(screen.getByRole('alert')).toHaveTextContent('Your password is incorrect.');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the failure carries none', async () => {
    addSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderDialog();

    await signIn('hunter22');

    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t sign in. Please try again.');
  });

  it('clears the error as the writer types again', async () => {
    addSession.mockRejectedValueOnce(wrongPassword());
    renderDialog();
    await signIn('nope');

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'n' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks for the emailed code when the site requires one', async () => {
    const { onSucceeded } = await reachCodeStep('2FA_TOKEN_REQUIRED');

    expect(screen.getByRole('alertdialog')).toHaveTextContent('2FA confirmation');
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Enter the sign-in verification code sent to your email.',
    );
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it('says so when the code is for a new device', async () => {
    await reachCodeStep('2FA_NEW_DEVICE_DETECTED');

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Verify it’s really you');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('signing in from a new device');
  });

  it('refuses a code that is not six digits without a request', async () => {
    await reachCodeStep('2FA_TOKEN_REQUIRED');

    await verify('');
    expect(screen.getByRole('alert')).toHaveTextContent('Verification code is required');

    await verify('12ab');
    expect(screen.getByRole('alert')).toHaveTextContent('Verification code must be 6 numbers');
    expect(verifySession).not.toHaveBeenCalled();
  });

  it('names a wrong code and stays on the code step', async () => {
    verifySession.mockRejectedValueOnce(wrongCode());
    const { onSucceeded } = await reachCodeStep('2FA_TOKEN_REQUIRED');

    await verify('000000');

    expect(verifySession).toHaveBeenCalledWith({ token: '000000' });
    expect(screen.getByRole('alert')).toHaveTextContent('Your verification code is incorrect.');
    expect(screen.getByLabelText('Verification code')).toBeInTheDocument();
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it('reports success once the code is accepted', async () => {
    verifySession.mockResolvedValueOnce('OK');
    const { onSucceeded } = await reachCodeStep('2FA_TOKEN_REQUIRED');

    await verify(' 123456 ');

    expect(verifySession).toHaveBeenCalledWith({ token: '123456' });
    expect(onSucceeded).toHaveBeenCalledTimes(1);
  });

  it('abandons from the cancel button', () => {
    const { onSucceeded, onAbandoned } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onAbandoned).toHaveBeenCalledTimes(1);
    expect(onSucceeded).not.toHaveBeenCalled();
    expect(addSession).not.toHaveBeenCalled();
  });

  it('abandons on Escape and ignores a click outside', () => {
    const { onAbandoned } = renderDialog();

    fireEvent.pointerDown(document.body);
    expect(onAbandoned).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(onAbandoned).toHaveBeenCalledTimes(1);
  });
});
