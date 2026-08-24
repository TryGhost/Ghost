import { createRoot } from 'react-dom/client';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
import { emberMutationHandlers } from './ember-bridge';
import { navigateTo } from './utils/navigation';

const framework = {
  ghostVersion: '',
  externalNavigate: (link: { route: string; isExternal: boolean; replace?: boolean }) => {
    navigateTo(link.route, { replace: link.replace });
  },
  unsplashConfig: {
    Authorization: 'Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980',
    'Accept-Version': 'v1',
    'Content-Type': 'application/json',
    'App-Pragma': 'no-cache',
    'X-Unsplash-Cache': true,
  },
  sentryDSN: null,
  ...emberMutationHandlers,
};

createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
