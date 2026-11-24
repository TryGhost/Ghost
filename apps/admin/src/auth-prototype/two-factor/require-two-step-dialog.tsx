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
import { Stack, Text } from '@tryghost/shade/primitives';
import { formatNumber } from '@tryghost/shade/utils';

/** Switching "Require two-step verification" on. Counts come from the staff Admin already loaded. */
export function RequireTwoStepDialog({
  open,
  withoutTwoStep,
  ssoProviderName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** Emails of staff (not on SSO) who haven't turned two-step on yet. */
  withoutTwoStep: string[];
  /** Set when SSO covers some staff, who aren't affected. */
  ssoProviderName: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = withoutTwoStep.length;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Require two-step verification?</AlertDialogTitle>
          <AlertDialogDescription>
            Every staff member will need an authenticator app to sign in. Anyone who hasn’t set one
            up will be asked to before they can continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Stack gap="md">
          {count > 0 ? (
            <Banner variant="warning">
              <Stack gap="xs">
                <Text size="md" weight="medium">
                  {formatNumber(count)} staff {count === 1 ? 'member hasn’t' : 'members haven’t'}{' '}
                  turned it on yet:
                </Text>
                <ul className="list-disc pl-5 text-md">
                  {withoutTwoStep.slice(0, 3).map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                  {count > 3 && <li>and {formatNumber(count - 3)} more</li>}
                </ul>
                <Text size="md">
                  We’ll email them so they can set it up before they next sign in.
                </Text>
              </Stack>
            </Banner>
          ) : (
            <Banner variant="info">
              <Text size="md">Everyone has already turned it on.</Text>
            </Banner>
          )}
          {ssoProviderName && (
            <Text size="sm" tone="secondary">
              Staff who sign in with {ssoProviderName} aren’t affected. {ssoProviderName} handles
              their second step.
            </Text>
          )}
        </Stack>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Require two-step</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
