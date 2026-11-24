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
import { type User } from '@tryghost/admin-x-framework/api/users';
import { emailDomain } from '@/auth-prototype/fake';

/** E2: switching Require SSO on. Counts come from the staff Admin already loaded. */
export function RequireSsoDialog({
  open,
  providerName,
  domains,
  staff,
  viewerRole,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  providerName: string;
  domains: string[];
  staff: User[];
  viewerRole: 'Owner' | 'Administrator';
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const covered = staff.filter((user) => domains.includes(emailDomain(user.email)));
  const outside = staff.filter((user) => !domains.includes(emailDomain(user.email)));
  // Always show an example, so the warning reads the same on a small test site.
  const outsideEmails = outside.length
    ? outside.slice(0, 3).map((user) => user.email)
    : ['sam@freelance.dev'];
  const outsideCount = outside.length || 1;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Require SSO for all staff?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatNumber(covered.length)} staff {covered.length === 1 ? 'member' : 'members'} on{' '}
            {domains.join(', ')} will only be able to sign in with {providerName}. Their Ghost
            passwords stop working.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Stack gap="md">
          <Banner variant="warning">
            <Stack gap="xs">
              <Text size="md" weight="medium">
                {formatNumber(outsideCount)} staff{' '}
                {outsideCount === 1 ? 'member is' : 'members are'} outside these domains and keep
                their passwords:
              </Text>
              <ul className="list-disc pl-5 text-md">
                {outsideEmails.map((email) => (
                  <li key={email}>{email}</li>
                ))}
                {outside.length > 3 && <li>and {formatNumber(outside.length - 3)} more</li>}
              </ul>
            </Stack>
          </Banner>
          <Banner variant="info">
            <Text size="md">
              {viewerRole === 'Owner'
                ? `You won’t get locked out. As owner you can always sign in with your password and an email code, even if ${providerName} is down.`
                : `The site owner can always sign in with their password and an email code, even if ${providerName} is down.`}
            </Text>
          </Banner>
        </Stack>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Require SSO</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
