export type ProviderId = 'okta' | 'google' | 'entra' | 'workos' | 'oidc' | 'saml';

export interface ProviderField {
  id: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
}

export interface Provider {
  id: ProviderId;
  /** Full name, for the picker and headings. */
  name: string;
  /** Short name, for buttons like "Continue with Okta". */
  shortName: string;
  initials: string;
  description: string;
  fields: ProviderField[];
  /** Where the secret lives, for the invalid_client hint. */
  secretLocation: string;
}

const oidcFields = (issuerPlaceholder: string): ProviderField[] => [
  { id: 'issuer', label: 'Issuer URL', placeholder: issuerPlaceholder },
  { id: 'clientId', label: 'Client ID', placeholder: '0oa1b2c3d4e5f6g7h8' },
  { id: 'clientSecret', label: 'Client secret', secret: true },
];

export const PROVIDERS: Provider[] = [
  {
    id: 'okta',
    name: 'Okta',
    shortName: 'Okta',
    initials: 'Ok',
    description: 'OpenID Connect',
    fields: oidcFields('https://acme.okta.com'),
    secretLocation: 'Okta > Applications > Ghost > General',
  },
  {
    id: 'google',
    name: 'Google Workspace',
    shortName: 'Google',
    initials: 'G',
    description: 'OpenID Connect',
    fields: [
      {
        id: 'clientId',
        label: 'Client ID',
        placeholder: '1234567890-abc.apps.googleusercontent.com',
      },
      { id: 'clientSecret', label: 'Client secret', secret: true },
    ],
    secretLocation: 'Google Cloud console > APIs & Services > Credentials',
  },
  {
    id: 'entra',
    name: 'Microsoft Entra ID',
    shortName: 'Microsoft',
    initials: 'Me',
    description: 'OpenID Connect',
    fields: [
      { id: 'tenant', label: 'Directory (tenant) ID', placeholder: '72f988bf-86f1-41af-91ab' },
      { id: 'clientId', label: 'Application (client) ID', placeholder: 'a1b2c3d4-e5f6-7890' },
      { id: 'clientSecret', label: 'Client secret value', secret: true },
    ],
    secretLocation: 'Entra admin center > App registrations > Ghost > Certificates & secrets',
  },
  {
    id: 'workos',
    name: 'WorkOS',
    shortName: 'WorkOS',
    initials: 'W',
    description: 'Connects to any provider',
    fields: [
      { id: 'clientId', label: 'Client ID', placeholder: 'client_01H...' },
      { id: 'clientSecret', label: 'API key', secret: true },
    ],
    secretLocation: 'WorkOS dashboard > API keys',
  },
  {
    id: 'oidc',
    name: 'Other (OpenID Connect)',
    shortName: 'your company login',
    initials: 'ID',
    description: 'Any OIDC provider',
    fields: oidcFields('https://login.example.com'),
    secretLocation: "your provider's app settings",
  },
  {
    id: 'saml',
    name: 'Other (SAML)',
    shortName: 'your company login',
    initials: 'SA',
    description: 'Any SAML 2.0 provider',
    fields: [
      {
        id: 'metadata',
        label: 'Identity provider metadata URL',
        placeholder: 'https://login.example.com/saml/metadata',
      },
    ],
    secretLocation: "your provider's SAML app settings",
  },
];

export function getProvider(id: ProviderId): Provider {
  return PROVIDERS.find((provider) => provider.id === id) ?? PROVIDERS[0];
}
