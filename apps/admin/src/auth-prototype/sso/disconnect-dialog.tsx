import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
} from '@tryghost/shade/components';
import { Text } from '@tryghost/shade/primitives';

/** E4: disconnecting the provider. */
export function DisconnectDialog({
  open,
  providerName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  providerName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {providerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Staff go back to signing in with a password and email code. Require SSO turns off.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Banner variant="warning">
          <Text size="md">
            Staff who have only ever signed in with {providerName} don’t have a Ghost password yet.
            They’ll need to use “Forgot password” the next time they sign in.
          </Text>
        </Banner>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
