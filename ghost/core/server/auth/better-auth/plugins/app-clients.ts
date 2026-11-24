import { getCurrentAdapter } from 'better-auth';
import type { AuthContext, Where } from 'better-auth';
import { APP_PROVIDER_ID } from '../app-tokens';

type Adapter = Awaited<ReturnType<typeof getCurrentAdapter>>;

/**
 * The grant the user client lists, and that the tokens Ghost issues are labelled with. No
 * endpoint serves it, so the client is shut out of every provider endpoint: an empty
 * grant list would mean `authorization_code`.
 */
export const APP_SESSION_GRANT = 'urn:ghost:params:oauth:grant-type:app-session';

// Every client Ghost keeps for an installation starts with this
const APP_CLIENT_PREFIX = 'ghost-app-';

/** What the user client of an installation is kept in step with. */
export type AppClientInstallation = {
  installationId: string;
  active: boolean;
  scopes: readonly string[];
};

/**
 * Which installation an app client belongs to, and which of its clients it is. Each
 * installation has one client of each kind; only the user client exists so far.
 */
export type AppClientOwner = { installationId: string; kind: 'user' };

const CLIENT_KINDS: ReadonlySet<string> = new Set<AppClientOwner['kind']>(['user']);

/**
 * The client's id. Lowercase, since MySQL compares client ids case-insensitively; installation
 * ids are lowercase ObjectIds.
 */
export function appClientId({ installationId, kind }: AppClientOwner): string {
  return `${APP_CLIENT_PREFIX}${kind}-${installationId.toLowerCase()}`;
}

function appClientMetadata({ installationId, kind }: AppClientOwner) {
  return { ghost_app_installation_id: installationId, ghost_app_client: kind };
}

/**
 * The owner of a client row, read from its metadata, or null for a client that isn't an app's.
 * Its id must also be the one Ghost gives that owner's client.
 */
export function appClientOwnerOf(client: {
  clientId: string;
  metadata?: unknown;
}): AppClientOwner | null {
  const metadata: unknown =
    typeof client.metadata === 'string' ? parsedOrNull(client.metadata) : client.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return null;
  }
  const { ghost_app_installation_id: installationId, ghost_app_client: kind } = metadata as Record<
    string,
    unknown
  >;
  if (typeof installationId !== 'string' || typeof kind !== 'string' || !CLIENT_KINDS.has(kind)) {
    return null;
  }
  const owner = { installationId, kind: kind as AppClientOwner['kind'] };
  return appClientId(owner) === client.clientId ? owner : null;
}

function parsedOrNull(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** The user client row Ghost keeps for an installation, in the provider's model. */
export function appUserClient({ installationId, active, scopes }: AppClientInstallation) {
  const owner: AppClientOwner = { installationId, kind: 'user' };
  return {
    clientId: appClientId(owner),
    disabled: !active,
    skipConsent: true,
    enableEndSession: false,
    scopes: [...scopes],
    clientCredentialsScopes: [] as string[],
    redirectUris: [] as string[],
    grantTypes: [APP_SESSION_GRANT],
    responseTypes: [] as string[],
    tokenEndpointAuthMethod: 'none',
    applicationType: 'web',
    requirePKCE: true,
    dpopBoundAccessTokens: false,
    metadata: appClientMetadata(owner),
  };
}

type AppClientRow = ReturnType<typeof appUserClient> & { id: string };

const differs = (current: Record<string, unknown>, wanted: Record<string, unknown>) =>
  Object.entries(wanted).some(
    ([field, value]) => JSON.stringify(current[field] ?? null) !== JSON.stringify(value ?? null),
  );

/**
 * Makes an installation's user client match it: unowned, shut out of every provider endpoint,
 * disabled unless the installation is active. Safe to repeat. An inactive installation's tokens
 * are deleted, and so are those of a client enabled again, so none issued while it was disabled
 * comes back.
 */
export async function reconcileAppUserClient(
  adapter: Adapter,
  installation: AppClientInstallation,
): Promise<void> {
  const wanted = appUserClient(installation);
  const where = [{ field: 'clientId', value: wanted.clientId }];
  let reenabled = false;
  const write = async () => {
    const current = await adapter.findOne<AppClientRow>({ model: 'oauthClient', where });
    reenabled = !!current?.disabled && !wanted.disabled;
    if (!current) {
      const now = new Date();
      await adapter.create({
        model: 'oauthClient',
        data: { ...wanted, createdAt: now, updatedAt: now },
      });
    } else if (differs(current, wanted)) {
      await adapter.update({
        model: 'oauthClient',
        where,
        update: { ...wanted, updatedAt: new Date() },
      });
    }
  };
  try {
    await write();
  } catch (err) {
    // Two runs that both found no row: the second insert loses, and updates instead
    await write().catch(() => {
      throw err;
    });
  }
  if (!installation.active || reenabled) {
    await adapter.deleteMany({ model: 'oauthAccessToken', where });
  }
}

/**
 * Deletes app tokens: a user's across every app, or every app's. Through the adapter, so it
 * reaches them wherever they're stored; does nothing unless the provider is registered.
 */
export async function deleteAppTokens(
  context: Pick<AuthContext, 'adapter' | 'hasPlugin'>,
  of: { userId: string } | { all: true },
): Promise<void> {
  if (!context.hasPlugin(APP_PROVIDER_ID)) {
    return;
  }
  const where: Where[] = [{ field: 'clientId', operator: 'starts_with', value: APP_CLIENT_PREFIX }];
  if ('userId' in of) {
    where.push({ field: 'userId', value: of.userId });
  }
  const adapter = await getCurrentAdapter(context.adapter);
  await adapter.deleteMany({ model: 'oauthAccessToken', where });
}
