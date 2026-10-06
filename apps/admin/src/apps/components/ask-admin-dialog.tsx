import React from 'react';
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { type User, isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useAppManagers } from '@/apps/lib/app-managers';

function initials(user: User) {
  const words = (user.name || user.email).trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

const ManagerRow: React.FC<{ user: User }> = ({ user }) => (
  <li className="flex items-center gap-3 border-b py-3" data-testid="app-manager">
    <Avatar
      className="size-9"
      colorSeed={user.name || user.email}
      initials={initials(user)}
      src={user.profile_image}
    />
    <Stack className="min-w-0" gap="none">
      <Text as="div" className="truncate" weight="semibold">
        {user.name || user.email}
      </Text>
      <Text as="div" className="truncate" size="sm" tone="secondary">
        {isOwnerUser(user) ? 'Owner' : 'Administrator'}
        {user.email && (
          <>
            {' · '}
            <a className="hover:underline" href={`mailto:${user.email}`}>
              {user.email}
            </a>
          </>
        )}
      </Text>
    </Stack>
  </li>
);

/**
 * Shown instead of the install flow to staff who can't install apps, so an
 * install link sent to them points at the people who can.
 */
export const AskAdminDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { managers, isLoading } = useAppManagers();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md" data-testid="app-install-not-allowed-dialog">
        <DialogHeader>
          <DialogTitle>Ask an administrator to install this app</DialogTitle>
          <DialogDescription>
            Only the site owner and administrators can install apps. Ask one of them to install it
            for you.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Stack align="center" className="py-4">
            <LoadingIndicator size="md" />
          </Stack>
        ) : (
          managers.length > 0 && (
            <ul className="border-t" data-testid="app-managers">
              {managers.map((user) => (
                <ManagerRow key={user.id} user={user} />
              ))}
            </ul>
          )
        )}
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
