import { fireEvent, render, waitFor } from '../../../utils/test-utils';
import AccountPasskeysPage from '../../../../src/components/pages/account-passkeys-page';
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/browser';

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startRegistration: vi.fn(),
}));

const registrationOptions: PublicKeyCredentialCreationOptionsJSON = {
  rp: { id: 'example.com', name: 'Ghost' },
  user: { id: 'member-id', name: 'member@example.com', displayName: 'Member' },
  challenge: 'challenge',
  pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
};

const registrationResponse: RegistrationResponseJSON = {
  id: 'credential-id',
  rawId: 'credential-id',
  response: {
    attestationObject: 'attestation-object',
    clientDataJSON: 'client-data-json',
  },
  clientExtensionResults: {},
  type: 'public-key',
};

describe('Account Passkeys Page', () => {
  beforeEach(() => {
    vi.mocked(startRegistration).mockReset();
  });

  test('requires a name before enabling the primary add action', async () => {
    const api = {
      member: {
        passkeys: vi.fn(() =>
          Promise.resolve({
            passkeys: [
              {
                id: 'passkey-id',
                name: 'Work MacBook',
                created_at: '2026-08-25T12:00:00.000Z',
              },
            ],
          }),
        ),
      },
    };
    const { getByLabelText, getByRole, getByText } = render(<AccountPasskeysPage />, {
      overrideContext: {
        api,
        lastPage: 'accountHome',
        locale: 'en-US',
      },
    });

    await waitFor(() => expect(getByText('Work MacBook')).toBeInTheDocument());
    expect(getByText(/Added .*2026/)).toBeInTheDocument();
    expect(getByLabelText('Passkey name')).toBeInTheDocument();

    const addButton = getByRole('button', { name: 'Add passkey' });
    expect(addButton).toHaveClass('gh-portal-btn');
    expect(addButton).toBeDisabled();
    expect(addButton).not.toHaveClass('gh-portal-btn-primary');

    fireEvent.change(getByLabelText('Passkey name'), {
      target: { value: '  Work laptop  ' },
    });

    expect(addButton).toBeEnabled();
    expect(addButton).toHaveClass('gh-portal-btn-primary');
  });

  test('shows a clear error when the authenticator is already registered', async () => {
    vi.mocked(startRegistration).mockRejectedValue({
      code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
    });
    const api = {
      member: {
        passkeys: vi.fn(() => Promise.resolve({ passkeys: [] })),
        getIntegrityToken: vi.fn(() => Promise.resolve('integrity-token')),
        beginPasskeyRegistration: vi.fn(() =>
          Promise.resolve({ options: registrationOptions, ceremony: 'ceremony' }),
        ),
      },
    };
    const { findByText, getByLabelText, getByRole } = render(<AccountPasskeysPage />, {
      overrideContext: { api },
    });

    fireEvent.change(getByLabelText('Passkey name'), {
      target: { value: 'Existing passkey' },
    });
    fireEvent.click(getByRole('button', { name: 'Add passkey' }));

    expect(await findByText('This passkey is already registered.')).toBeInTheDocument();
  });

  test('does not replace a newly registered passkey with a stale initial response', async () => {
    let resolveInitialPasskeys!: (value: { passkeys: never[] }) => void;
    const initialPasskeys = new Promise<{ passkeys: never[] }>((resolve) => {
      resolveInitialPasskeys = resolve;
    });
    vi.mocked(startRegistration).mockResolvedValue(registrationResponse);
    const api = {
      member: {
        passkeys: vi.fn(() => initialPasskeys),
        getIntegrityToken: vi.fn(() => Promise.resolve('integrity-token')),
        beginPasskeyRegistration: vi.fn(() =>
          Promise.resolve({ options: registrationOptions, ceremony: 'ceremony' }),
        ),
        finishPasskeyRegistration: vi.fn(() =>
          Promise.resolve({
            passkeys: [
              {
                id: 'new-passkey',
                name: 'New passkey',
                created_at: '2026-08-25T12:00:00.000Z',
              },
            ],
          }),
        ),
      },
    };
    const { getByLabelText, getByRole, getByText } = render(<AccountPasskeysPage />, {
      overrideContext: { api },
    });

    fireEvent.change(getByLabelText('Passkey name'), {
      target: { value: 'New passkey' },
    });
    fireEvent.click(getByRole('button', { name: 'Add passkey' }));
    await waitFor(() => expect(getByText('New passkey')).toBeInTheDocument());

    resolveInitialPasskeys({ passkeys: [] });
    await waitFor(() => expect(getByText('New passkey')).toBeInTheDocument());
  });

  test('shows an accessible error when passkey removal fails', async () => {
    const api = {
      member: {
        passkeys: vi.fn(() =>
          Promise.resolve({
            passkeys: [
              {
                id: 'passkey-id',
                name: 'Work MacBook',
                created_at: '2026-08-25T12:00:00.000Z',
              },
            ],
          }),
        ),
        getIntegrityToken: vi.fn(() => Promise.resolve('integrity-token')),
        removePasskey: vi.fn(() => Promise.reject(new Error('Network error'))),
      },
    };
    const { findByRole, findByText, getByRole } = render(<AccountPasskeysPage />, {
      overrideContext: { api },
    });

    await findByText('Work MacBook');
    fireEvent.click(getByRole('button', { name: 'Remove' }));

    const alert = await findByRole('alert');
    expect(alert).toHaveTextContent('Unable to remove passkey. Please try again.');
    expect(getByRole('button', { name: 'Remove' })).toBeEnabled();
  });

  test('does not render passkeys from an invalid list response', async () => {
    const api = {
      member: {
        passkeys: vi.fn(() =>
          Promise.resolve({
            passkeys: [{ id: '', name: 'Untrusted passkey', created_at: 'not-a-date' }],
          }),
        ),
      },
    };
    const { queryByText } = render(<AccountPasskeysPage />, {
      overrideContext: { api },
    });

    await waitFor(() => expect(api.member.passkeys).toHaveBeenCalled());
    expect(queryByText('Untrusted passkey')).not.toBeInTheDocument();
  });

  test('does not pass invalid registration options to WebAuthn', async () => {
    const api = {
      member: {
        passkeys: vi.fn(() => Promise.resolve({ passkeys: [] })),
        getIntegrityToken: vi.fn(() => Promise.resolve('integrity-token')),
        beginPasskeyRegistration: vi.fn(() =>
          Promise.resolve({ options: { challenge: 'incomplete' }, ceremony: 'ceremony' }),
        ),
      },
    };
    const { findByText, getByLabelText, getByRole } = render(<AccountPasskeysPage />, {
      overrideContext: { api },
    });

    fireEvent.change(getByLabelText('Passkey name'), {
      target: { value: 'Work MacBook' },
    });
    fireEvent.click(getByRole('button', { name: 'Add passkey' }));

    expect(await findByText('Unable to add passkey. Please try again.')).toBeInTheDocument();
    expect(startRegistration).not.toHaveBeenCalled();
  });
});
