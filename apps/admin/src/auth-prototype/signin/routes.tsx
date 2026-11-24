import { type AdminRouteHandle, type RouteObject } from '@tryghost/admin-x-framework';

const handle = { hideAdminSidebar: true } satisfies AdminRouteHandle;

/**
 * The sign-in demo routes, inside the signed-in Admin so the presenter keeps
 * their session. Each screen shows "not found" while the prototype is off.
 */
export const authPrototypeRoutes: RouteObject[] = [
  {
    path: '/auth-demo',
    handle,
    lazy: async () => ({ Component: (await import('./demo-signin')).default }),
  },
  {
    path: '/auth-demo/sso',
    handle,
    lazy: async () => ({ Component: (await import('./demo-sso-continue')).default }),
  },
  {
    path: '/auth-demo/provider',
    handle,
    lazy: async () => ({ Component: (await import('./demo-provider')).default }),
  },
  {
    path: '/auth-demo/password',
    handle,
    lazy: async () => ({ Component: (await import('./demo-password')).default }),
  },
  {
    path: '/auth-demo/code',
    handle,
    lazy: async () => ({ Component: (await import('./demo-code')).DemoCode }),
  },
  {
    path: '/auth-demo/setup-two-step',
    handle,
    lazy: async () => ({ Component: (await import('./demo-setup-two-step')).default }),
  },
  {
    path: '/auth-demo/backup',
    handle,
    lazy: async () => ({ Component: (await import('./demo-code')).DemoBackup }),
  },
  {
    path: '/auth-demo/email-code',
    handle,
    lazy: async () => ({ Component: (await import('./demo-code')).DemoEmailCode }),
  },
  {
    path: '/auth-demo/result/:kind',
    handle,
    lazy: async () => ({ Component: (await import('./demo-result')).DemoSsoResult }),
  },
  {
    path: '/auth-demo/help',
    handle,
    lazy: async () => ({ Component: (await import('./demo-result')).DemoHelp }),
  },
  {
    path: '/auth-demo/done',
    handle,
    lazy: async () => ({ Component: (await import('./demo-result')).DemoDone }),
  },
];
