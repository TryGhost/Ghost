import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
import { captureDeliveredSecureKey } from './settings/api';

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

// Before the router and Sentry see the address: it may carry a Stripe key.
captureDeliveredSecureKey();
createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
