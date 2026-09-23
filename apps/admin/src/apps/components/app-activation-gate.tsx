import { Button, EmptyIndicator } from '@tryghost/shade/components';
import { Link, Outlet } from '@tryghost/admin-x-framework';
import { AppsDetailShell } from '@/apps/components/apps-detail-shell';
import { getApp } from '@/apps/app-registry';
import { useIsAppActivated } from '@/apps/app-activation';

/**
 * Renders an app's routes only once the app is active; otherwise prompts to
 * run the activation flow instead of showing an empty screen.
 */
export function AppActivationGate({ appId }: { appId: string }) {
  const app = getApp(appId);
  const isActivated = useIsAppActivated(appId);

  if (isActivated) {
    return <Outlet />;
  }
  if (!app) {
    return null;
  }

  const Icon = app.icon;
  return (
    <AppsDetailShell
      breadcrumb={[{ label: 'Apps', to: '/apps' }, { label: app.name }]}
      testId={`${app.id}-inactive`}
    >
      <div className="flex flex-1 items-center justify-center">
        <EmptyIndicator
          actions={
            <Button asChild>
              <Link to={`/apps/${app.id}/activate`}>Activate {app.name}</Link>
            </Button>
          }
          description={`Activate the app to start using ${app.name}.`}
          title={`${app.name} is not active`}
        >
          <Icon />
        </EmptyIndicator>
      </div>
    </AppsDetailShell>
  );
}

export default AppActivationGate;
