/**
 * Public surface of the onboarding domain, consumed by the admin shell
 * (apps/admin/src/routes.tsx and the home redirect). Everything else in this
 * domain is internal.
 */
export { OnboardingRedirect } from './onboarding-redirect';
export { useOnboarding } from './hooks/use-onboarding';

// Lazy entry, not a component re-export: the shell mounts it behind `lazy:`,
// so a static re-export would pull the chunk into the shell bundle.
export const lazyOnboardingScreen = () => import('./onboarding-route');
