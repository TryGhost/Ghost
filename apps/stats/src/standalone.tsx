import './styles/index.css';
import App from './App';
import renderShadeApp from '@tryghost/admin-x-framework/test/render-shade';
import {AppSettings} from '@tryghost/admin-x-framework';

// Use test overrides if available, otherwise use defaults
const defaultAppSettings: AppSettings = {
    paidMembersEnabled: true,
    newslettersEnabled: true,
    analytics: {
        emailTrackOpens: true,
        emailTrackClicks: true,
        membersTrackSources: true,
        outboundLinkTagging: true,
        webAnalytics: true
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
renderShadeApp(App, {appSettings: defaultAppSettings} as any);
