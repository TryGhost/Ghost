import { type ReactNode, useState } from 'react';
import {
  Badge,
  Banner,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Link,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import useStaffUsers from '@/settings/hooks/use-staff-users';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { isSsoConfigured, updateSso, useDemoState } from '@/auth-prototype/demo-store';
import { DisconnectDialog } from './disconnect-dialog';
import { getProvider } from './providers';
import { RequireSsoDialog } from './require-sso-dialog';
import { ProviderMark, type SetupStep, SsoSetupModal } from './sso-setup-modal';
import { SecuritySubsection } from '@/auth-prototype/security-subsection';

function PrototypeOption({ children }: { children: ReactNode }) {
  return (
    <Stack className="rounded-md border border-dashed border-border-default p-3" gap="sm">
      <Text className="tracking-wide uppercase" size="xs" tone="tertiary" weight="semibold">
        Prototype option
      </Text>
      {children}
    </Stack>
  );
}

function ConnectedBody({
  onEdit,
  onTest,
  onDisconnect,
  onRequireChange,
}: {
  onEdit: () => void;
  onTest: () => void;
  onDisconnect: () => void;
  onRequireChange: (required: boolean) => void;
}) {
  const { sso, ui } = useDemoState();
  const provider = getProvider(sso.provider);
  const failing = sso.status === 'failing';

  return (
    <Stack gap="lg">
      <Inline align="start" className="rounded-lg bg-muted p-4" gap="md" justify="between">
        <Inline align="start" className="min-w-0" gap="md">
          {/* As tall as the name and domain rows together. */}
          <ProviderMark className="size-11 text-md" provider={provider} />
          <Stack className="min-w-0" gap="xs">
            <Inline gap="sm">
              <Text size="md" weight="semibold">
                {provider.name}
              </Text>
              {failing ? (
                <Badge variant="destructive">Sign-ins failing</Badge>
              ) : (
                <Badge variant="success">Connected</Badge>
              )}
            </Inline>
            <Text size="sm" tone="secondary">
              {sso.domains.join(', ')}
            </Text>
            {!failing && (
              <Text size="sm" tone="secondary">
                Last sign-in 2 min ago by anna@acme.com · No errors in the last 7 days
              </Text>
            )}
          </Stack>
        </Inline>
        <Inline gap="sm">
          <Button className="bg-surface-elevated" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="More SSO actions"
                className="bg-surface-elevated"
                size="icon"
                variant="outline"
              >
                <LucideIcon.Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onTest}>Test connection</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={onDisconnect}
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Inline>
      </Inline>

      {failing && (
        <Banner role="alert" variant="destructive">
          <Stack gap="sm">
            <Text size="md">
              The last 6 sign-ins failed. {provider.shortName} didn’t answer in time (since 09:12).
              We emailed you about it.
            </Text>
            {sso.required && (
              <Text size="md">
                Staff can’t sign in while {provider.shortName} is down. Turning off “Require SSO”
                lets them use their passwords again.
              </Text>
            )}
            <Link
              className="self-start text-sm"
              href="#"
              onClick={(event) => event.preventDefault()}
            >
              View sign-in log
            </Link>
          </Stack>
        </Banner>
      )}

      <Separator />

      <Inline align="start" gap="lg" justify="between">
        <Stack gap="xs">
          <Text size="md" weight="semibold">
            Require SSO for all staff
          </Text>
          <Text size="sm" tone="secondary">
            Staff on these domains can only sign in with {provider.shortName}. You can still use
            your password.
          </Text>
        </Stack>
        <Switch
          aria-label="Require SSO for all staff"
          checked={sso.required}
          onCheckedChange={onRequireChange}
        />
      </Inline>

      {ui.showJoinOption && (
        <PrototypeOption>
          <Inline gap="md" justify="between" wrap>
            <Label className="text-sm font-normal" htmlFor="sso-provisioning">
              New people from these domains
            </Label>
            <Select
              value={sso.provisioning === 'invite-only' ? 'invite-only' : sso.autoJoinRole}
              onValueChange={(value) => {
                if (value === 'invite-only') {
                  updateSso({ provisioning: 'invite-only' });
                } else {
                  updateSso({
                    provisioning: 'auto-join',
                    autoJoinRole: value as 'Contributor' | 'Author' | 'Editor',
                  });
                }
              }}
            >
              <SelectTrigger className="w-56" id="sso-provisioning">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invite-only">Must be invited first</SelectItem>
                <SelectItem value="Contributor">Can join as Contributor</SelectItem>
                <SelectItem value="Author">Can join as Author</SelectItem>
                <SelectItem value="Editor">Can join as Editor</SelectItem>
              </SelectContent>
            </Select>
          </Inline>
        </PrototypeOption>
      )}
    </Stack>
  );
}

/** Flow 1: the Single sign-on part of Settings > Security. */
export function SsoSection() {
  const demo = useDemoState();
  const { currentUser, siteData } = useGlobalData();
  const { users } = useStaffUsers();
  const [modal, setModal] = useState<{ open: boolean; step: SetupStep }>({
    open: false,
    step: 'provider',
  });
  const [confirmRequire, setConfirmRequire] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const provider = getProvider(demo.sso.provider);
  const configured = isSsoConfigured(demo.sso);

  const openModal = (step: SetupStep) => setModal({ open: true, step });

  if (demo.plan === 'no-sso') {
    return (
      <SecuritySubsection
        action={
          <Button variant="outline" onClick={() => toast('Plans page (not part of the prototype)')}>
            See plans
          </Button>
        }
        badge={<Badge variant="purple">Business plan</Badge>}
        description="Let staff sign in with your company login, like Okta, Google Workspace or Microsoft Entra. Single sign-on is included on the Business plan."
        title="Single sign-on"
      />
    );
  }

  return (
    <>
      <SecuritySubsection
        action={
          configured ? undefined : (
            <Button variant="outline" onClick={() => openModal('provider')}>
              Set up SSO
            </Button>
          )
        }
        badge={<Badge variant="secondary">Beta</Badge>}
        description={
          configured
            ? undefined
            : 'Let staff sign in with your company login, like Okta, Google Workspace or Microsoft Entra.'
        }
        title="Single sign-on"
      >
        {configured && (
          <ConnectedBody
            onDisconnect={() => setConfirmDisconnect(true)}
            onEdit={() => openModal('connect')}
            onRequireChange={(required) => {
              if (required) {
                setConfirmRequire(true);
              } else {
                updateSso({ required: false });
                toast.success('SSO is no longer required', {
                  description: 'Staff can sign in with their passwords again.',
                });
              }
            }}
            onTest={() => openModal('test')}
          />
        )}
      </SecuritySubsection>

      <SsoSetupModal
        email={currentUser.email}
        initialStep={modal.step}
        open={modal.open}
        siteUrl={siteData?.url ?? window.location.origin}
        onClose={() => setModal((current) => ({ ...current, open: false }))}
      />
      <RequireSsoDialog
        domains={demo.sso.domains}
        open={confirmRequire}
        providerName={provider.shortName}
        staff={users}
        viewerRole={demo.viewerRole}
        onCancel={() => setConfirmRequire(false)}
        onConfirm={() => {
          setConfirmRequire(false);
          updateSso({ required: true });
          toast.success('SSO is now required', {
            description: `Staff on ${demo.sso.domains.join(', ')} sign in with ${provider.shortName}.`,
          });
        }}
      />
      <DisconnectDialog
        open={confirmDisconnect}
        providerName={provider.shortName}
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => {
          setConfirmDisconnect(false);
          updateSso({ status: 'off', required: false });
          toast.success(`${provider.shortName} disconnected`);
        }}
      />
    </>
  );
}
