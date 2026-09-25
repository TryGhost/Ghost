import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import type { IntegrationsResponseType } from '@tryghost/admin-x-framework/api/integrations';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import type { UsersResponseType } from '@tryghost/admin-x-framework/api/users';
import { apiUrl, getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import { useFeatureFlag, useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { Button } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmberOwnedRouteMatcher } from '@/routes';

const MIGRATE_ORIGIN = 'https://migrate.ghost.org';

interface MigrateMessage {
  request?: unknown;
  route?: unknown;
}

function migrateFrameUrl(platform: string | undefined): string {
  return platform ? `${MIGRATE_ORIGIN}?platform=${platform}` : MIGRATE_ORIGIN;
}

/**
 * The self-serve migration app, embedded fullscreen. The app asks for the
 * credentials it imports with (`{request: 'apiUrl'}`) and can send Admin to
 * another route (`{route}`).
 */
const Migrate = () => {
  const { '*': platform } = useParams();
  const [src] = useState(() => migrateFrameUrl(platform || undefined));
  const frameRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const isEmberOwned = useEmberOwnedRouteMatcher();
  const fetchApi = useFetchApi();
  const { data: configData } = useBrowseConfig();
  const { data: settingsData } = useBrowseSettings();
  const csvContentImporter = useFeatureFlag('csvContentImporter');

  const settings = settingsData?.settings ?? null;
  const stripe = Boolean(
    getSettingValue(settings, 'stripe_connect_account_id') &&
    getSettingValue(settings, 'stripe_connect_publishable_key') &&
    getSettingValue(settings, 'stripe_connect_livemode'),
  );
  const ghostVersion = configData?.config.version.match(/^(\d+\.)?(\d+)/)?.[0];

  useEffect(() => {
    const sendInitialData = async () => {
      try {
        const [{ integrations }, { users }] = await Promise.all([
          fetchApi<IntegrationsResponseType>(
            apiUrl('/integrations/', { include: 'api_keys', limit: 'all' }),
          ),
          fetchApi<UsersResponseType>(
            apiUrl('/users/', { filter: "roles.name:'Owner'", limit: '1', include: 'roles' }),
          ),
        ]);
        const apiKey = integrations.find(
          (integration) => integration.slug === 'self-serve-migration',
        )?.api_keys?.[0]?.secret;
        const ownerEmail = users[0]?.email;

        if (!apiKey || !ownerEmail) {
          throw new Error('The self-serve migration integration or site owner is missing');
        }

        frameRef.current?.contentWindow?.postMessage(
          {
            request: 'initialData',
            response: {
              apiUrl: `${window.location.origin}${getGhostPaths().adminRoot}`.replace(/\/$/, ''),
              apiKey,
              stripe,
              csvContentImporter,
              ghostVersion,
              ownerEmail,
            },
          },
          MIGRATE_ORIGIN,
        );
      } catch {
        // Leaving the screen is only right while it is still open.
        if (!frameRef.current) {
          return;
        }
        navigate('/settings/migration');
        toast.error('Error initialising migration. Please try again later.');
      }
    };

    const handleMessage = (event: MessageEvent<MigrateMessage | null>) => {
      if (event.origin !== MIGRATE_ORIGIN) {
        return;
      }

      if (event.data?.request === 'apiUrl') {
        void sendInitialData();
        return;
      }

      const route = event.data?.route;
      if (typeof route === 'string') {
        navigate(route, { crossApp: isEmberOwned(route) });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [csvContentImporter, fetchApi, ghostVersion, isEmberOwned, navigate, stripe]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <iframe
        ref={frameRef}
        className="absolute inset-0 size-full border-0"
        src={src}
        title="Migrate"
      />
      <Button
        aria-label="Close"
        className="absolute top-6 right-6"
        size="icon"
        variant="ghost"
        onClick={() => navigate('/settings/migration')}
      >
        <LucideIcon.X />
      </Button>
    </div>
  );
};

export default Migrate;
