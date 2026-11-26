import { getCurrentAdapter } from 'better-auth';
import type { AuthContext, Where } from 'better-auth';
import { z } from 'zod';
import { DbJson } from '../../../lib/db-types/json';
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
export const appClientInstallationSchema = z.object({
  installationId: z.string(),
  active: z.boolean(),
  scopes: z.array(z.string()).readonly(),
});

export type AppClientInstallation = z.infer<typeof appClientInstallationSchema>;

/**
 * Which installation an app client belongs to, and which of its clients it is, as the client's
 * metadata records it. Each installation has one client of each kind; only the user client
 * exists so far.
 */
const appClientMetadataSchema = z.object({
  ghost_app_installation_id: z.string(),
  ghost_app_client: z.enum(['user']),
});

// The provider hands metadata back as stored, JSON text, or decoded
const storedAppClientMetadataSchema = z.union([
  DbJson(appClientMetadataSchema, { message: "The app client's metadata is not JSON." }),
  appClientMetadataSchema,
]);

export type AppClientOwner = {
  installationId: string;
  kind: z.infer<typeof appClientMetadataSchema>['ghost_app_client'];
};

/**
 * The client's id. Lowercase, since MySQL compares client ids case-insensitively; installation
 * ids are lowercase ObjectIds.
 */
export function appClientId({ installationId, kind }: AppClientOwner): string {
  return `${APP_CLIENT_PREFIX}${kind}-${installationId.toLowerCase()}`;
}

function appClientMetadata({
  installationId,
  kind,
}: AppClientOwner): z.infer<typeof appClientMetadataSchema> {
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
  const parsed = storedAppClientMetadataSchema.safeParse(client.metadata);
  if (!parsed.success) {
    return null;
  }
  const owner: AppClientOwner = {
    installationId: parsed.data.ghost_app_installation_id,
    kind: parsed.data.ghost_app_client,
  };
  return appClientId(owner) === client.clientId ? owner : null;
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

const differs = (current: Record<string, unknown>, wanted: Record<string, unknown>) =>
  Object.entries(wanted).some(
    ([field, value]) => JSON.stringify(current[field] ?? null) !== JSON.stringify(value ?? null),
  );

/**
 * Makes an installation's user client match it: unowned, shut out of every provider endpoint,
 * disabled unless the installation is active. Safe to repeat. An inactive installation's tokens
 * are deleted, and so are those of a client enabled again, so none issued while it was disabled
 * comes back. They are deleted before it is enabled, so a failed delete leaves it disabled and
 * the next run deletes them again.
 */
export async function reconcileAppUserClient(
  adapter: Adapter,
  installation: AppClientInstallation,
): Promise<void> {
  const wanted = appUserClient(installation);
  const where = [{ field: 'clientId', value: wanted.clientId }];
  const deleteTokens = () => adapter.deleteMany({ model: 'oauthAccessToken', where });
  const write = async () => {
    // Unparsed: any row that differs from the wanted one is overwritten
    const current = await adapter.findOne<Record<string, unknown>>({ model: 'oauthClient', where });
    if (!current) {
      const now = new Date();
      await adapter.create({
        model: 'oauthClient',
        data: { ...wanted, createdAt: now, updatedAt: now },
      });
    } else if (differs(current, wanted)) {
      // Anything but false counts as disabled, so the tokens are deleted before enabling
      const wasDisabled = current.disabled !== false;
      if (wasDisabled && !wanted.disabled) {
        await deleteTokens();
      }
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
  if (!installation.active) {
    await deleteTokens();
  }
}

/**
 * Deletes app tokens: a user's across every app, or every app's. Through the adapter, so it
 * reaches them wherever they're stored; does nothing unless the provider is registered.
 *
 * Runs inside security events after their sessions are gone, and validation refuses a token
 * without its session anyway, so a failed delete is logged rather than failing the event.
 */
export async function deleteAppTokens(
  context: Pick<AuthContext, 'adapter' | 'hasPlugin' | 'logger'>,
  of: { userId: string } | { all: true },
): Promise<void> {
  if (!context.hasPlugin(APP_PROVIDER_ID)) {
    return;
  }
  const where: Where[] = [{ field: 'clientId', operator: 'starts_with', value: APP_CLIENT_PREFIX }];
  if ('userId' in of) {
    where.push({ field: 'userId', value: of.userId });
  }
  try {
    const adapter = await getCurrentAdapter(context.adapter);
    await adapter.deleteMany({ model: 'oauthAccessToken', where });
  } catch (err) {
    context.logger.error('Failed to delete app tokens', err);
  }
}
