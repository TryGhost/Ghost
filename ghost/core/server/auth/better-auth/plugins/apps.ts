import { jwt } from 'better-auth/plugins';
import { oauthProvider, type OAuthOptions, type Scope } from '@better-auth/oauth-provider';
import { ghostJwtSchema, ghostOAuthProviderSchema } from '../ghost-models';
import { APP_TOKEN_PREFIX } from '../../app-token-prefix';

/** The tables the provider and jwt plugins need; neither is registered without them. */
export const APP_OAUTH_TABLES: readonly string[] = [
  ...Object.values(ghostOAuthProviderSchema).map(({ modelName }) => modelName),
  ghostJwtSchema.jwks.modelName,
];

export type AppProviderOptions = {
  /** Better Auth's `baseURL`: the admin origin */
  adminOrigin: string;
};

/** The provider's options. */
export function appProviderOptions({ adminOrigin }: AppProviderOptions) {
  // No client can reach the authorize endpoint, so neither page is ever shown
  const adminPage = `${adminOrigin}/ghost/`;
  return {
    schema: ghostOAuthProviderSchema,
    loginPage: adminPage,
    consentPage: adminPage,
    // Ghost holds every token to the installation's approved scopes itself
    scopes: [],
    // Ghost issues every token itself, so the token endpoint accepts no grant and the
    // authorize endpoint answers 404
    grantTypes: [],
    // Provider-wide; ID tokens are only for apps
    idTokenExpiresIn: 300,
    prefix: { opaqueAccessToken: APP_TOKEN_PREFIX },
    // Clients are written by Ghost; nobody manages them through the provider's endpoints
    clientPrivileges: () => false,
  } satisfies OAuthOptions<Scope[]>;
}

/** The provider and the jwt plugin it signs with, registered only while apps can use them. */
export function appOAuthPlugins(options: AppProviderOptions) {
  return [
    jwt({ schema: ghostJwtSchema, disableSettingJwtHeader: true }),
    oauthProvider(appProviderOptions(options)),
  ] as const;
}
