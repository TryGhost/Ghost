import { AppActivationGate } from '@/apps/components/app-activation-gate';

/** The Podcasts pages only make sense once the app is active. */
export function PodcastsAppGuard() {
  return <AppActivationGate appId="podcasts" />;
}

export default PodcastsAppGuard;
