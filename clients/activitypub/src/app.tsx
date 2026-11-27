import { FeatureFlagsProvider } from './lib/feature-flags';
import {
  FrameworkProvider,
  Outlet,
  RouterProvider,
  TopLevelFrameworkProps,
} from '@tryghost/admin-x-framework';
import { ShadeApp } from '@tryghost/shade/app';
import { routes } from '@src/routes';

interface AppProps {
  framework: TopLevelFrameworkProps;
}

const App: React.FC<AppProps> = ({ framework }) => {
  return (
    <FrameworkProvider {...framework}>
      <RouterProvider prefix={'/'} routes={routes}>
        <FeatureFlagsProvider>
          <ShadeApp className="shade-activitypub" darkMode={false}>
            <Outlet />
          </ShadeApp>
        </FeatureFlagsProvider>
      </RouterProvider>
    </FrameworkProvider>
  );
};

export default App;
