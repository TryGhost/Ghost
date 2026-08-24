import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
import { navigateTo } from './utils/navigation';

const framework = {
  ghostVersion: '',
  externalNavigate: (link: { route: string; isExternal: boolean; replace?: boolean }) => {
    navigateTo(link.route, { replace: link.replace });
  },
  unsplashConfig: defaultUnsplashConfig,
  sentryDSN: null,
  onUpdate: (dataType: string, response: unknown) => {
    window.EmberBridge?.state.onUpdate(dataType, response);
  },
  onInvalidate: (dataType: string) => {
    window.EmberBridge?.state.onInvalidate(dataType);
  },
  onDelete: (dataType: string, id: string) => {
    window.EmberBridge?.state.onDelete(dataType, id);
  },
};

createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
