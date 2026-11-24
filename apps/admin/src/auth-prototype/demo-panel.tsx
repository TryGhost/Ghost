import { type ReactNode, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import {
  Button,
  Checkbox,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { useAuthPrototypeEnabled } from './enabled';
import {
  PRESETS,
  applyPreset,
  resetDemo,
  setDemoState,
  updateSignin,
  updatePolicy,
  updateSso,
  updateUi,
  updateTwoFactor,
  useDemoState,
} from './demo-store';
import { BACKUP_CODES, emailDomain } from './fake';
import { DEMO_EMAILS, DEMO_OWNER_FALLBACK, useOwnerEmail } from './people';
import { PROVIDERS, type ProviderId } from './sso/providers';

function ControlSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <Inline gap="sm" justify="between">
      <Text as="span" size="sm" tone="secondary">
        {label}
      </Text>
      <Select value={value} onValueChange={(next) => onChange(next as Value)}>
        <SelectTrigger aria-label={label} className="h-7 w-40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Inline>
  );
}

function ControlSwitch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Inline gap="sm" justify="between">
      <Label className="text-sm font-normal text-text-secondary" htmlFor={id}>
        {label}
      </Label>
      <Switch checked={checked} id={id} size="sm" onCheckedChange={onChange} />
    </Inline>
  );
}

function ControlCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Inline gap="sm">
      <Checkbox checked={checked} id={id} onCheckedChange={(value) => onChange(value === true)} />
      <Label className="text-sm font-normal text-text-secondary" htmlFor={id}>
        {label}
      </Label>
    </Inline>
  );
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <Text as="h3" className="tracking-wide uppercase" size="xs" tone="tertiary" weight="semibold">
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function PanelBody({ onJump }: { onJump: () => void }) {
  const state = useDemoState();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const realOwnerEmail = useOwnerEmail();
  // The owner demo is about SSO, so use the stand-in owner when the real
  // owner's email isn't on an SSO domain.
  const ownerEmail = state.sso.domains.includes(emailDomain(realOwnerEmail))
    ? realOwnerEmail
    : DEMO_OWNER_FALLBACK;

  const jump = (route: string) => {
    onJump();
    navigate(route);
  };

  const shortcuts: { label: string; run: () => void }[] = [
    { label: 'Security settings', run: () => jump('/settings/security') },
    {
      label: 'Your Security tab',
      run: () => jump(`/settings/staff/${currentUser?.slug ?? ''}/security`),
    },
    {
      label: 'Sign-in demo: SSO user',
      run: () => jump(`/auth-demo?as=${encodeURIComponent(DEMO_EMAILS.ssoUser)}`),
    },
    {
      label: 'Sign-in demo: authenticator user',
      run: () => {
        if (state.twoFactor.method !== 'app') {
          updateTwoFactor({ method: 'app', addedAt: new Date().toISOString() });
        }
        jump(`/auth-demo?as=${encodeURIComponent(DEMO_EMAILS.outsideDomain)}`);
      },
    },
    {
      label: 'Sign-in demo: owner',
      run: () => jump(`/auth-demo?as=${encodeURIComponent(ownerEmail)}`),
    },
  ];

  return (
    <Stack className="max-h-[70vh] overflow-y-auto p-4" gap="lg">
      <Inline justify="between">
        <Text as="h2" size="md" weight="semibold">
          Sign-in prototype
        </Text>
        <Button size="sm" variant="ghost" onClick={resetDemo}>
          Reset prototype
        </Button>
      </Inline>

      <PanelSection title="Presets">
        <Inline gap="xs" wrap>
          {PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              variant="outline"
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </Inline>
      </PanelSection>

      <PanelSection title="Jump to">
        <Stack gap="none">
          {shortcuts.map((shortcut) => (
            <Button
              key={shortcut.label}
              className="justify-between"
              size="sm"
              variant="ghost"
              onClick={shortcut.run}
            >
              {shortcut.label}
              <LucideIcon.ArrowRight />
            </Button>
          ))}
        </Stack>
      </PanelSection>

      <Separator />

      <PanelSection title="Site">
        <ControlSelect
          label="You are the"
          options={[
            { value: 'Owner', label: 'Owner' },
            { value: 'Administrator', label: 'Administrator' },
          ]}
          value={state.viewerRole}
          onChange={(viewerRole) => setDemoState((current) => ({ ...current, viewerRole }))}
        />
        <ControlSelect
          label="Plan"
          options={[
            { value: 'includes-sso', label: 'Includes SSO' },
            { value: 'no-sso', label: 'No SSO' },
          ]}
          value={state.plan}
          onChange={(plan) => setDemoState((current) => ({ ...current, plan }))}
        />
      </PanelSection>

      <PanelSection title="Single sign-on">
        <ControlSelect
          label="Status"
          options={[
            { value: 'off', label: 'Off' },
            { value: 'connected', label: 'Connected' },
            { value: 'failing', label: 'Sign-ins failing' },
          ]}
          value={state.sso.status}
          onChange={(status) => updateSso({ status })}
        />
        <ControlSelect<ProviderId>
          label="Provider"
          options={PROVIDERS.map((provider) => ({ value: provider.id, label: provider.name }))}
          value={state.sso.provider}
          onChange={(provider) => updateSso({ provider })}
        />
        <ControlSwitch
          checked={state.sso.required}
          id="auth-prototype-required"
          label="Required for all staff"
          onChange={(required) => updateSso({ required })}
        />
        <ControlSelect
          label="Next test"
          options={[
            { value: 'pass', label: 'Passes' },
            { value: 'bad-secret', label: 'Bad secret' },
            { value: 'unreachable', label: 'Unreachable' },
          ]}
          value={state.sso.nextTestResult}
          onChange={(nextTestResult) => updateSso({ nextTestResult })}
        />
        <ControlSelect
          label="Next domain check"
          options={[
            { value: 'found', label: 'Finds the record' },
            { value: 'missing', label: 'Record not found yet' },
          ]}
          value={state.sso.nextDomainCheck}
          onChange={(nextDomainCheck) => updateSso({ nextDomainCheck })}
        />
        <ControlSwitch
          checked={state.sso.domains.every((domain) => state.sso.verifiedDomains.includes(domain))}
          id="auth-prototype-domains-verified"
          label="Domains verified"
          onChange={(verified) =>
            updateSso({ verifiedDomains: verified ? [...state.sso.domains] : [] })
          }
        />
        <ControlCheckbox
          checked={state.ui.showJoinOption}
          id="auth-prototype-show-join-option"
          label="Show “New people” option in Settings"
          onChange={(showJoinOption) => updateUi({ showJoinOption })}
        />
        <ControlSelect
          label="New people"
          options={[
            { value: 'invite-only', label: 'Invite first' },
            { value: 'auto-join', label: 'Can join' },
          ]}
          value={state.sso.provisioning}
          onChange={(provisioning) => updateSso({ provisioning })}
        />
        <ControlSelect
          label="Join as"
          options={[
            { value: 'Contributor', label: 'Contributor' },
            { value: 'Author', label: 'Author' },
            { value: 'Editor', label: 'Editor' },
          ]}
          value={state.sso.autoJoinRole}
          onChange={(autoJoinRole) => updateSso({ autoJoinRole })}
        />
      </PanelSection>

      <PanelSection title="Site rules (Security)">
        <ControlSwitch
          checked={state.policy.requireTwoStep}
          id="auth-prototype-require-two-step-panel"
          label="Require two-step"
          onChange={(requireTwoStep) => updatePolicy({ requireTwoStep })}
        />
        <ControlSwitch
          checked={state.policy.emailCodeEverySignin}
          id="auth-prototype-email-every-signin-panel"
          label="Email a code every sign-in"
          onChange={(emailCodeEverySignin) => updatePolicy({ emailCodeEverySignin })}
        />
      </PanelSection>

      <PanelSection title="Two-step verification (you)">
        <ControlSelect
          label="Two-step"
          options={[
            { value: 'email', label: 'Off' },
            { value: 'app', label: 'On (authenticator app)' },
          ]}
          value={state.twoFactor.method}
          onChange={(method) =>
            updateTwoFactor({
              method,
              addedAt:
                method === 'app' ? (state.twoFactor.addedAt ?? new Date().toISOString()) : null,
            })
          }
        />
        <ControlSelect
          label="Backup codes left"
          options={Array.from({ length: 11 }, (_, count) => ({
            value: String(10 - count),
            label: String(10 - count),
          }))}
          value={String(state.twoFactor.backupCodes.length)}
          onChange={(count) =>
            updateTwoFactor({ backupCodes: BACKUP_CODES.slice(10 - Number(count)) })
          }
        />
      </PanelSection>

      <PanelSection title="Sign-in demo">
        <ControlSelect
          label="Provider answers"
          options={[
            { value: 'success', label: 'Signs you in' },
            { value: 'rejected', label: 'Rejects you' },
            { value: 'unreachable', label: 'Times out' },
          ]}
          value={state.signinScenario.providerOutcome}
          onChange={(providerOutcome) => updateSignin({ providerOutcome })}
        />
        <ControlSwitch
          checked={state.signinScenario.hasStaffAccount}
          id="auth-prototype-staff-account"
          label="Has a staff account"
          onChange={(hasStaffAccount) => updateSignin({ hasStaffAccount })}
        />
      </PanelSection>
    </Stack>
  );
}

/** The floating "Prototype" button and its scenario panel. Renders nothing while the prototype is off. */
export function AuthPrototypePanel() {
  const enabled = useAuthPrototypeEnabled();
  const [open, setOpen] = useState(false);

  if (!enabled) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-60">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button className="bg-surface-elevated shadow-md" size="sm" variant="outline">
            <LucideIcon.FlaskConical />
            Prototype
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[360px] p-0" side="top" sideOffset={8}>
          {open && <PanelBody onJump={() => setOpen(false)} />}
        </PopoverContent>
      </Popover>
    </div>
  );
}
