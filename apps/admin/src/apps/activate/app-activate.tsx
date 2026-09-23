import React from 'react';
import { Button } from '@tryghost/shade/components';
import { Box, Container, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { Link, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { AppIconTile } from '@/apps/components/app-card';
import { LucideIcon } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import { getApp, getAppHomePath } from '@/apps/app-registry';
import { toast } from 'sonner';
import { useAppActivation } from '@/apps/app-activation';

interface AppActivateProps {
  /** Overrides the `:appId` route param for routes mounted under a fixed app. */
  appId?: string;
}

/**
 * The activation step for an app: what it adds, and one button to turn it
 * on. Deliberately chrome-free (no header, no breadcrumb) so the focus stays
 * on the decision. Stubbed: activation flips local state only.
 */
const AppActivate: React.FC<AppActivateProps> = ({ appId: appIdProp }) => {
  const params = useParams<{ appId: string }>();
  const app = getApp(appIdProp ?? params.appId);
  const navigate = useNavigate();
  const { isActivated, activate } = useAppActivation(app?.id ?? '');

  if (!app) {
    return <NotFound />;
  }

  const managePath = getAppHomePath(app);

  const handleActivate = () => {
    activate();
    toast.success(`${app.name} activated`);
    void navigate(managePath);
  };

  return (
    <Box
      className="flex size-full items-center justify-center overflow-y-auto"
      data-testid="app-activate"
    >
      {/* Centred in the view, both ways; scrolls only when the view is too short. */}
      <Container className="my-auto w-full py-16" size="sm">
        <Stack align="center" className="text-center" gap="2xl">
          <Stack align="center" gap="lg">
            <AppIconTile className="size-16" color={app.color} icon={app.icon} />
            <Stack gap="sm">
              <Text as="h1" size="3xl" weight="semibold">
                {app.name}
              </Text>
              <Text size="lg" tone="secondary">
                {app.description}
              </Text>
            </Stack>
          </Stack>

          <ul
            className="flex w-full max-w-[420px] flex-col gap-4 text-left"
            data-testid="app-activate-highlights"
          >
            {app.highlights.map((highlight) => (
              <li key={highlight.title} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${app.color}1A`, color: app.color }}
                >
                  <LucideIcon.Check className="size-3.5" />
                </span>
                <Stack gap="none">
                  <Text weight="medium">{highlight.title}</Text>
                  <Text size="sm" tone="secondary">
                    {highlight.description}
                  </Text>
                </Stack>
              </li>
            ))}
          </ul>

          <Inline align="center" gap="md" justify="center">
            {isActivated ? (
              <Button asChild>
                <Link to={managePath}>Manage {app.name}</Link>
              </Button>
            ) : (
              <Button data-testid="app-activate-button" onClick={handleActivate}>
                Activate {app.name}
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link to="/apps">Cancel</Link>
            </Button>
          </Inline>
        </Stack>
      </Container>
    </Box>
  );
};

export default AppActivate;
