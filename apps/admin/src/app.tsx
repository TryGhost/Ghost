import { Outlet } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { EmberProvider, EmberFallback, EmberRoot } from './ember-bridge';
import { AdminLayout } from './layout/admin-layout';
import { useEmberAuthSync, useEmberDataSync } from './ember-bridge';
import { DocsBotWidgetHost } from './docsbot-widget-host';

function App() {
  const { data: currentUser } = useCurrentUser();
  useEmberAuthSync();
  useEmberDataSync();

  return (
    <EmberProvider>
      {currentUser ? (
        <AdminLayout>
          <Outlet />
          <EmberRoot />
          <DocsBotWidgetHost />
        </AdminLayout>
      ) : (
        <>
          <EmberFallback />
          <EmberRoot />
        </>
      )}
    </EmberProvider>
  );
}

export default App;
