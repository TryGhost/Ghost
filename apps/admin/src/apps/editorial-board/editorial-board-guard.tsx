import { AppActivationGate } from '@/apps/components/app-activation-gate';

/** The Editorial board pages only make sense once the app is active. */
export function EditorialBoardGuard() {
  return <AppActivationGate appId="editorial-board" />;
}

export default EditorialBoardGuard;
