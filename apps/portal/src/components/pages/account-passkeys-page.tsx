import React from 'react';
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { z } from 'zod';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import BackButton from '../common/back-button';
import CloseButton from '../common/close-button';
import InputForm from '../common/input-form';
import { t } from '../../utils/i18n';

const passkeySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

const passkeyListResponseSchema = z.object({
  passkeys: z.array(passkeySchema),
});

const registrationOptionsSchema = z.object({
  rp: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  user: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    displayName: z.string(),
  }),
  challenge: z.string().min(1),
  pubKeyCredParams: z.array(
    z.object({
      alg: z.number().int(),
      type: z.literal('public-key'),
    }),
  ),
  timeout: z.number().positive().optional(),
  excludeCredentials: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.literal('public-key'),
        transports: z
          .array(z.enum(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb']))
          .optional(),
      }),
    )
    .optional(),
  authenticatorSelection: z
    .object({
      authenticatorAttachment: z.enum(['cross-platform', 'platform']).optional(),
      requireResidentKey: z.boolean().optional(),
      residentKey: z.enum(['discouraged', 'preferred', 'required']).optional(),
      userVerification: z.enum(['discouraged', 'preferred', 'required']).optional(),
    })
    .optional(),
  hints: z.array(z.enum(['hybrid', 'security-key', 'client-device'])).optional(),
  attestation: z.enum(['direct', 'enterprise', 'indirect', 'none']).optional(),
  attestationFormats: z
    .array(
      z.enum(['fido-u2f', 'packed', 'android-safetynet', 'android-key', 'tpm', 'apple', 'none']),
    )
    .optional(),
  extensions: z
    .object({
      appid: z.string().optional(),
      credProps: z.boolean().optional(),
      hmacCreateSecret: z.boolean().optional(),
      minPinLength: z.boolean().optional(),
    })
    .optional(),
});

const registrationOptionsResponseSchema = z.object({
  options: registrationOptionsSchema,
  ceremony: z.string().min(1),
});

function validatedRegistrationOptions(
  value: z.infer<typeof registrationOptionsSchema>,
): PublicKeyCredentialCreationOptionsJSON {
  return {
    rp: value.rp,
    user: value.user,
    challenge: value.challenge,
    pubKeyCredParams: value.pubKeyCredParams,
    ...(value.timeout === undefined ? {} : { timeout: value.timeout }),
    ...(value.excludeCredentials === undefined
      ? {}
      : {
          excludeCredentials: value.excludeCredentials.map((credential) => ({
            id: credential.id,
            type: credential.type,
            ...(credential.transports === undefined ? {} : { transports: credential.transports }),
          })),
        }),
    ...(value.authenticatorSelection === undefined
      ? {}
      : {
          authenticatorSelection: {
            ...(value.authenticatorSelection.authenticatorAttachment === undefined
              ? {}
              : {
                  authenticatorAttachment: value.authenticatorSelection.authenticatorAttachment,
                }),
            ...(value.authenticatorSelection.requireResidentKey === undefined
              ? {}
              : { requireResidentKey: value.authenticatorSelection.requireResidentKey }),
            ...(value.authenticatorSelection.residentKey === undefined
              ? {}
              : { residentKey: value.authenticatorSelection.residentKey }),
            ...(value.authenticatorSelection.userVerification === undefined
              ? {}
              : { userVerification: value.authenticatorSelection.userVerification }),
          },
        }),
    ...(value.hints === undefined ? {} : { hints: value.hints }),
    ...(value.attestation === undefined ? {} : { attestation: value.attestation }),
    ...(value.attestationFormats === undefined
      ? {}
      : { attestationFormats: value.attestationFormats }),
    ...(value.extensions === undefined
      ? {}
      : {
          extensions: {
            ...(value.extensions.appid === undefined ? {} : { appid: value.extensions.appid }),
            ...(value.extensions.credProps === undefined
              ? {}
              : { credProps: value.extensions.credProps }),
            ...(value.extensions.hmacCreateSecret === undefined
              ? {}
              : { hmacCreateSecret: value.extensions.hmacCreateSecret }),
            ...(value.extensions.minPinLength === undefined
              ? {}
              : { minPinLength: value.extensions.minPinLength }),
          },
        }),
  };
}

const passkeyErrorCodeSchema = z.object({
  code: z.string(),
});

type Passkey = z.infer<typeof passkeySchema>;

interface PortalMemberApi {
  passkeys: () => Promise<unknown>;
  getIntegrityToken: () => Promise<string>;
  beginPasskeyRegistration: (input: { integrityToken: string }) => Promise<unknown>;
  finishPasskeyRegistration: (input: {
    response: RegistrationResponseJSON;
    ceremony: string;
    integrityToken: string;
    name: string;
  }) => Promise<unknown>;
  removePasskey: (id: string, integrityToken: string) => Promise<void>;
}

interface PortalContextValue {
  api: { member: PortalMemberApi };
  brandColor: string;
  doAction: (action: string, data?: Record<string, unknown>) => unknown;
  lastPage?: string;
  locale?: string;
  member: unknown | null;
}

interface AccountPasskeysState {
  passkeys: Passkey[];
  passkeysAvailable: boolean;
  passkeyBusy: boolean;
  passkeyError: string;
  passkeyActionError: string;
  passkeyName: string;
}

export default class AccountPasskeysPage extends React.Component<
  Record<string, never>,
  AccountPasskeysState
> {
  static override contextType = AppContext;
  declare context: PortalContextValue;
  private passkeysRevision = 0;

  constructor(props: Record<string, never>, context: PortalContextValue) {
    super(props, context);
    this.state = {
      passkeys: [],
      passkeysAvailable: browserSupportsWebAuthn(),
      passkeyBusy: false,
      passkeyError: '',
      passkeyActionError: '',
      passkeyName: '',
    };
  }

  override componentDidMount() {
    if (!this.context.member) {
      this.context.doAction('switchPage', { page: 'signin' });
      return;
    }
    if (this.state.passkeysAvailable) {
      const revision = this.passkeysRevision;
      this.context.api.member
        .passkeys()
        .then((body) => {
          const { passkeys } = passkeyListResponseSchema.parse(body);
          if (revision === this.passkeysRevision) {
            this.setState({ passkeys });
          }
        })
        .catch(() => undefined);
    }
  }

  async addPasskey() {
    const name = this.state.passkeyName.trim();
    if (!name) {
      return;
    }
    this.setState({
      passkeyBusy: true,
      passkeyError: '',
      passkeyActionError: '',
    });
    try {
      const beginIntegrityToken = await this.context.api.member.getIntegrityToken();
      const { options: untrustedOptions, ceremony } = registrationOptionsResponseSchema.parse(
        await this.context.api.member.beginPasskeyRegistration({
          integrityToken: beginIntegrityToken,
        }),
      );
      const options = validatedRegistrationOptions(untrustedOptions);
      const response = await startRegistration({ optionsJSON: options });
      const finishIntegrityToken = await this.context.api.member.getIntegrityToken();
      const result = passkeyListResponseSchema.parse(
        await this.context.api.member.finishPasskeyRegistration({
          response,
          ceremony,
          integrityToken: finishIntegrityToken,
          name,
        }),
      );
      this.passkeysRevision += 1;
      this.setState((state) => ({
        passkeys: [...state.passkeys, ...result.passkeys],
        passkeyName: '',
      }));
    } catch (error: unknown) {
      const errorCode = passkeyErrorCodeSchema.safeParse(error);
      if (
        (errorCode.success &&
          errorCode.data.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') ||
        (error instanceof Error && error.message === 'This passkey is already registered.')
      ) {
        this.setState({
          passkeyError: t('This passkey is already registered.'),
        });
      } else if (
        !(error instanceof Error && error.name === 'NotAllowedError') &&
        !(errorCode.success && errorCode.data.code === 'ERROR_CEREMONY_ABORTED')
      ) {
        this.setState({
          passkeyError: t('Unable to add passkey. Please try again.'),
        });
      }
    } finally {
      this.setState({ passkeyBusy: false });
    }
  }

  async removePasskey(id: string) {
    this.setState({ passkeyBusy: true, passkeyActionError: '' });
    try {
      const integrityToken = await this.context.api.member.getIntegrityToken();
      await this.context.api.member.removePasskey(id, integrityToken);
      this.setState((state) => ({
        passkeys: state.passkeys.filter((passkey) => passkey.id !== id),
      }));
    } catch {
      this.setState({
        passkeyActionError: t('Unable to remove passkey. Please try again.'),
      });
    } finally {
      this.setState({ passkeyBusy: false });
    }
  }

  formatPasskeyCreatedAt(createdAt: string) {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const formattedDate = new Intl.DateTimeFormat(this.context.locale || undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
    return t('Added {date}', { date: formattedDate });
  }

  renderHeader() {
    return (
      <header className="gh-portal-detail-header">
        <BackButton
          brandColor={this.context.brandColor}
          hidden={!this.context.lastPage}
          onClick={() => this.context.doAction('back')}
        />
        <h3 className="gh-portal-main-title">{t('Passkeys')}</h3>
      </header>
    );
  }

  renderPasskeyList() {
    if (!this.state.passkeys.length) {
      return null;
    }
    return (
      <div className="gh-portal-list" style={{ marginTop: '20px' }}>
        {this.state.passkeys.map((passkey) => {
          const addedDate = this.formatPasskeyCreatedAt(passkey.created_at);
          return (
            <section key={passkey.id}>
              <div className="gh-portal-list-detail">
                <h3>{passkey.name}</h3>
                {addedDate && <p>{addedDate}</p>}
              </div>
              <button
                className="gh-portal-btn gh-portal-btn-list"
                disabled={this.state.passkeyBusy}
                style={{ color: this.context.brandColor }}
                type="button"
                onClick={() => this.removePasskey(passkey.id)}
              >
                {t('Remove')}
              </button>
            </section>
          );
        })}
      </div>
    );
  }

  override render() {
    if (!this.context.member) {
      return null;
    }
    const hasValidPasskeyName = Boolean(this.state.passkeyName.trim());
    return (
      <div className="gh-portal-content">
        {this.renderHeader()}
        <CloseButton />
        <div className="gh-portal-section">
          <p>{t('Sign in with Touch ID, Face ID, your device PIN, or a security key.')}</p>
          {this.state.passkeysAvailable ? (
            <>
              {this.renderPasskeyList()}
              {this.state.passkeyActionError && (
                <p className="gh-portal-error-message" role="alert">
                  {this.state.passkeyActionError}
                </p>
              )}
              <div style={{ marginTop: '20px' }}>
                <InputForm
                  fields={[
                    {
                      type: 'text',
                      value: this.state.passkeyName,
                      placeholder: t('MacBook Touch ID'),
                      label: t('Passkey name'),
                      name: 'passkeyName',
                      required: true,
                      errorMessage: this.state.passkeyError,
                    },
                  ]}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    this.setState({
                      passkeyName: event.target.value,
                      passkeyError: '',
                    })
                  }
                />
              </div>
              <ActionButton
                brandColor={this.context.brandColor}
                dataTestId="add-passkey"
                disabled={this.state.passkeyBusy || !hasValidPasskeyName}
                isPrimary={hasValidPasskeyName}
                isRunning={this.state.passkeyBusy}
                label={t('Add passkey')}
                style={{ width: '100%', marginTop: '12px' }}
                onClick={() => this.addPasskey()}
              />
            </>
          ) : (
            <p>{t('Passkeys are not available in this browser.')}</p>
          )}
        </div>
      </div>
    );
  }
}
