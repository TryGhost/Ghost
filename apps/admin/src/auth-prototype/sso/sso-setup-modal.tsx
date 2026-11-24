import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Banner,
  Button,
  CopyField,
  CopyFieldActions,
  CopyFieldContent,
  CopyFieldCopyButton,
  CopyFieldValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  Link,
  LoadingIndicator,
  tokenFieldClasses,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import { type DemoState, getDemoState, updateSso, useDemoState } from '@/auth-prototype/demo-store';
import { DOMAIN_VERIFICATION_RECORD, fakeDelay } from '@/auth-prototype/fake';
import { PROVIDERS, type Provider, type ProviderId, getProvider } from './providers';

export type SetupStep = 'provider' | 'connect' | 'test';

/** The provider's logo on a white tile, or its initials (or a generic icon for "Other"). */
export function ProviderMark({ provider, className }: { provider: Provider; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-md border border-border-default bg-surface-elevated text-sm font-semibold text-foreground',
        className,
      )}
      aria-hidden
    >
      {provider.logo && provider.monochrome ? (
        // Masked like Admin's monochrome BrandIcons, so it takes the text colour.
        <span
          className="size-1/2 bg-current"
          style={{ mask: `url("${provider.logo}") center / contain no-repeat` }}
        />
      ) : provider.logo ? (
        <img alt="" className="size-1/2" src={provider.logo} />
      ) : provider.generic ? (
        <LucideIcon.Building2 className="size-1/2 text-muted-foreground" />
      ) : (
        provider.initials
      )}
    </span>
  );
}

function ProviderStep({
  selected,
  onSelect,
}: {
  selected: ProviderId;
  onSelect: (id: ProviderId) => void;
}) {
  return (
    <div aria-label="Provider" className="grid grid-cols-2 gap-3" role="radiogroup">
      {PROVIDERS.map((provider) => {
        const isSelected = provider.id === selected;
        return (
          <button
            key={provider.id}
            aria-checked={isSelected}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              isSelected
                ? 'border-primary bg-accent ring-1 ring-primary'
                : 'border-border-default hover:bg-accent',
            )}
            role="radio"
            type="button"
            onClick={() => onSelect(provider.id)}
          >
            <ProviderMark provider={provider} />
            <span className="min-w-0">
              <span className="block font-medium">{provider.name}</span>
              <span className="block text-sm text-muted-foreground">{provider.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NumberedSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <Inline align="start" gap="md">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
        {number}
      </span>
      <Stack className="min-w-0 flex-1" gap="sm">
        <Text size="md" weight="semibold">
          {title}
        </Text>
        {children}
      </Stack>
    </Inline>
  );
}

function DomainsField({
  domains,
  onChange,
}: {
  domains: string[];
  onChange: (domains: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const domain = draft.trim().toLowerCase().replace(/^@/, '');
    if (domain && !domains.includes(domain)) {
      onChange([...domains, domain]);
    }
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && domains.length) {
      onChange(domains.slice(0, -1));
    }
  };

  return (
    <div className={tokenFieldClasses.field} onClick={() => inputRef.current?.focus()}>
      {domains.map((domain) => (
        <Badge key={domain} className={tokenFieldClasses.chip} variant="secondary">
          {domain}
          <button
            aria-label={`Remove ${domain}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange(domains.filter((candidate) => candidate !== domain));
            }}
          >
            <LucideIcon.X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        aria-label="Email domains"
        className={tokenFieldClasses.input}
        placeholder={domains.length ? '' : 'acme.com'}
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

function VerifyDomains({
  domains,
  verified,
  checking,
  missed,
  onCheck,
}: {
  domains: string[];
  verified: string[];
  checking: boolean;
  missed: string[];
  onCheck: () => void;
}) {
  const allVerified = domains.every((domain) => verified.includes(domain));

  return (
    <>
      <Text size="sm" tone="secondary">
        Add this TXT record to the DNS settings of each domain. It shows you own the domain, so no
        one else can claim its staff.
      </Text>
      <CopyField value={DOMAIN_VERIFICATION_RECORD}>
        <CopyFieldContent>
          <CopyFieldValue aria-label="TXT record value" />
          <CopyFieldActions>
            <CopyFieldCopyButton />
          </CopyFieldActions>
        </CopyFieldContent>
      </CopyField>
      <Stack className="rounded-lg border border-border-default" gap="none">
        {domains.map((domain) => (
          <Inline
            key={domain}
            className="border-b border-border-default px-3 py-2 last:border-b-0"
            justify="between"
          >
            <Text as="span" size="md">
              {domain}
            </Text>
            {verified.includes(domain) ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="outline">Not verified</Badge>
            )}
          </Inline>
        ))}
      </Stack>
      {missed.length > 0 && (
        <Banner role="alert" variant="warning">
          <Text size="md">
            We couldn’t find the record on {missed.join(', ')} yet. DNS changes can take a few hours
            to show up, so try again later.
          </Text>
        </Banner>
      )}
      {!allVerified && (
        <Inline>
          <Button disabled={checking} variant="outline" onClick={onCheck}>
            {checking ? <LoadingIndicator size="sm" /> : 'Check domains'}
          </Button>
        </Inline>
      )}
    </>
  );
}

function ConnectStep({
  providerId,
  siteUrl,
  domains,
  onDomainsChange,
  verification,
}: {
  providerId: ProviderId;
  siteUrl: string;
  domains: string[];
  onDomainsChange: (domains: string[]) => void;
  verification: Omit<Parameters<typeof VerifyDomains>[0], 'domains'>;
}) {
  const provider = getProvider(providerId);
  const redirectUrl = `${siteUrl.replace(/\/$/, '')}/ghost/auth/sso/callback`;
  const appWord = providerId === 'saml' ? 'SAML app' : 'app';

  return (
    <Stack gap="xl">
      <NumberedSection number={1} title={`Create a Ghost ${appWord} in ${provider.shortName}`}>
        <Text size="sm" tone="secondary">
          Paste this redirect URL when {provider.shortName} asks for one.
        </Text>
        <CopyField value={redirectUrl}>
          <CopyFieldContent>
            <CopyFieldValue aria-label="Redirect URL" />
            <CopyFieldActions>
              <CopyFieldCopyButton />
            </CopyFieldActions>
          </CopyFieldContent>
        </CopyField>
        <Link className="text-sm" href="#" onClick={(event) => event.preventDefault()}>
          {provider.name} setup guide
        </Link>
      </NumberedSection>
      <NumberedSection number={2} title={`Copy the details from ${provider.shortName}`}>
        {provider.fields.map((field) => (
          <Field key={field.id}>
            <FieldLabel htmlFor={`sso-${field.id}`}>{field.label}</FieldLabel>
            <Input
              autoComplete="off"
              id={`sso-${field.id}`}
              placeholder={field.placeholder}
              type={field.secret ? 'password' : 'text'}
              data-1p-ignore
            />
          </Field>
        ))}
      </NumberedSection>
      <NumberedSection number={3} title="Choose which email domains use SSO">
        <DomainsField domains={domains} onChange={onDomainsChange} />
        <Text size="sm" tone="secondary">
          Staff with these email addresses will see “Continue with {provider.shortName}” when they
          sign in.
        </Text>
      </NumberedSection>
      {domains.length > 0 && (
        <NumberedSection number={4} title="Verify your domains">
          <VerifyDomains domains={domains} {...verification} />
        </NumberedSection>
      )}
    </Stack>
  );
}

type CheckState = 'pending' | 'running' | 'pass' | 'fail' | 'skipped';

function CheckRow({ state, children }: { state: CheckState; children: ReactNode }) {
  return (
    <Inline gap="sm">
      <span className="flex size-5 items-center justify-center">
        {state === 'running' && <LoadingIndicator size="sm" />}
        {state === 'pass' && <LucideIcon.CircleCheck className="size-5 text-state-success" />}
        {state === 'fail' && <LucideIcon.CircleX className="size-5 text-destructive" />}
        {(state === 'pending' || state === 'skipped') && (
          <LucideIcon.Circle className="size-5 text-muted-foreground/50" />
        )}
      </span>
      <Text
        as="span"
        className={state === 'skipped' || state === 'pending' ? 'text-muted-foreground' : undefined}
        size="md"
      >
        {children}
      </Text>
    </Inline>
  );
}

function TestStep({
  alreadyOn,
  providerId,
  domains,
  email,
  runId,
  onDone,
}: {
  providerId: ProviderId;
  domains: string[];
  email: string;
  runId: number;
  alreadyOn: boolean;
  onDone: (state: 'passed' | 'failed') => void;
}) {
  const provider = getProvider(providerId);
  const [checks, setChecks] = useState<CheckState[]>(['pending', 'pending', 'pending', 'pending']);
  const [result, setResult] = useState<DemoState['sso']['nextTestResult'] | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The test result applies once: a retry after a failure passes, as if
    // the details had been fixed. The demo panel can set it again.
    // Read once when the test starts, not on every change.
    const outcome = getDemoState().sso.nextTestResult;
    const failAt = outcome === 'unreachable' ? 0 : outcome === 'bad-secret' ? 1 : -1;

    const run = async () => {
      setResult(null);
      setShowDetails(false);
      const next: CheckState[] = ['running', 'pending', 'pending', 'pending'];
      setChecks([...next]);
      for (let index = 0; index < next.length; index++) {
        await fakeDelay(index === 0 ? 900 : 550);
        if (cancelled) {
          return;
        }
        if (index === failAt) {
          next[index] = 'fail';
          for (let rest = index + 1; rest < next.length; rest++) {
            next[rest] = 'skipped';
          }
          setChecks([...next]);
          setResult(outcome);
          updateSso({ nextTestResult: 'pass' });
          onDone('failed');
          return;
        }
        next[index] = 'pass';
        if (index + 1 < next.length) {
          next[index + 1] = 'running';
        }
        setChecks([...next]);
      }
      setResult('pass');
      onDone('passed');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [runId, onDone]);

  // The test signs in as you. When your own email isn't on these domains (as on
  // a demo site), show a matching address so the checklist reads naturally.
  const [localPart, domain = ''] = email.split('@');
  const testEmail = domains.includes(domain) || !domains[0] ? email : `${localPart}@${domains[0]}`;

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <CheckRow state={checks[0]}>{provider.shortName} is reachable</CheckRow>
        <CheckRow state={checks[1]}>
          {providerId === 'saml'
            ? 'Metadata and certificate accepted'
            : 'Client ID and secret accepted'}
        </CheckRow>
        <CheckRow state={checks[2]}>
          Signed in as <span className="font-medium">{testEmail}</span>
        </CheckRow>
        <CheckRow state={checks[3]}>Email domain matches</CheckRow>
      </Stack>

      {result === 'bad-secret' && (
        <Banner role="alert" variant="destructive">
          <Stack gap="sm">
            <Text size="md">
              {provider.shortName} said: <code className="font-mono">invalid_client</code>. The
              client secret doesn’t match this app. Copy it again from {provider.secretLocation}.
            </Text>
            <TechnicalDetails
              open={showDetails}
              text={`POST /oauth2/v1/token → 401\n{"error":"invalid_client","error_description":"Client authentication failed. Either the client or the client credentials are invalid."}`}
              onToggle={() => setShowDetails(!showDetails)}
            />
          </Stack>
        </Banner>
      )}
      {result === 'unreachable' && (
        <Banner role="alert" variant="destructive">
          <Stack gap="sm">
            <Text size="md">
              We couldn’t reach {provider.shortName}. Check the issuer URL, and that{' '}
              {provider.shortName} is up.
            </Text>
            <TechnicalDetails
              open={showDetails}
              text={'GET /.well-known/openid-configuration → timed out after 10s'}
              onToggle={() => setShowDetails(!showDetails)}
            />
          </Stack>
        </Banner>
      )}
      {result === 'pass' && !alreadyOn && (
        <Banner variant="info">
          <Text size="md">
            SSO is not on yet. Staff keep signing in as they do today until you turn it on.
          </Text>
        </Banner>
      )}
    </Stack>
  );
}

function TechnicalDetails({
  open,
  text,
  onToggle,
}: {
  open: boolean;
  text: string;
  onToggle: () => void;
}) {
  return (
    <Stack gap="xs">
      <button
        aria-expanded={open}
        className="flex items-center gap-1 self-start text-sm font-medium"
        type="button"
        onClick={onToggle}
      >
        {open ? (
          <LucideIcon.ChevronDown className="size-4" />
        ) : (
          <LucideIcon.ChevronRight className="size-4" />
        )}
        {open ? 'Hide technical details' : 'Show technical details'}
      </button>
      {open && (
        <pre className="overflow-x-auto rounded-md bg-surface-panel p-3 font-mono text-xs whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </Stack>
  );
}

type SetupFlowProps = {
  initialStep: SetupStep;
  siteUrl: string;
  email: string;
  onClose: () => void;
};

/** The dialog's body. It mounts fresh each time the dialog opens, so every open starts clean. */
function SetupFlow({ initialStep, siteUrl, email, onClose }: SetupFlowProps) {
  const demo = useDemoState();
  const [step, setStep] = useState<SetupStep>(initialStep);
  const [providerId, setProviderId] = useState<ProviderId>(demo.sso.provider);
  const [domains, setDomains] = useState<string[]>(demo.sso.domains);
  const [testState, setTestState] = useState<'running' | 'passed' | 'failed'>('running');
  const [runId, setRunId] = useState(0);
  const [verified, setVerified] = useState<string[]>(demo.sso.verifiedDomains);
  const [checking, setChecking] = useState(false);
  const [missed, setMissed] = useState<string[]>([]);
  const allVerified = domains.length > 0 && domains.every((domain) => verified.includes(domain));

  // Verification is saved straight away, as a server would, even before SSO is on.
  const checkDomains = async () => {
    setChecking(true);
    setMissed([]);
    await fakeDelay(900);
    setChecking(false);
    const unverified = domains.filter((domain) => !verified.includes(domain));
    // A miss applies once: the next check finds the record, as if DNS caught up.
    if (getDemoState().sso.nextDomainCheck === 'missing') {
      updateSso({ nextDomainCheck: 'found' });
      setMissed(unverified);
      return;
    }
    const next = [...verified, ...unverified];
    setVerified(next);
    updateSso({ verifiedDomains: next });
  };

  const provider = getProvider(providerId);
  const alreadyOn = demo.sso.status !== 'off';

  const startTest = () => {
    setTestState('running');
    setRunId((id) => id + 1);
    setStep('test');
  };

  const turnOn = () => {
    updateSso({ status: 'connected', provider: providerId, domains });
    toast.success(alreadyOn ? 'Connection is working' : `SSO is on`, {
      description: alreadyOn
        ? undefined
        : `Staff on ${domains.join(', ')} can now sign in with ${provider.shortName}.`,
    });
    onClose();
  };

  const titles: Record<SetupStep, string> = {
    provider: 'Choose your provider',
    connect: `Connect ${provider.name}`,
    test: 'Test connection',
  };
  const descriptions: Record<SetupStep, string> = {
    provider: 'Pick the login your team already uses.',
    connect: `Four steps, about ten minutes. You’ll need admin access to ${provider.shortName}.`,
    test: `We sign you in with ${provider.shortName} to check everything works.`,
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{titles[step]}</DialogTitle>
        <DialogDescription>{descriptions[step]}</DialogDescription>
      </DialogHeader>

      {step === 'provider' && <ProviderStep selected={providerId} onSelect={setProviderId} />}
      {step === 'connect' && (
        <ConnectStep
          domains={domains}
          providerId={providerId}
          siteUrl={siteUrl}
          verification={{
            verified,
            checking,
            missed,
            onCheck: () => void checkDomains(),
          }}
          onDomainsChange={(next) => {
            setDomains(next);
            setMissed([]);
          }}
        />
      )}
      {step === 'test' && (
        <TestStep
          alreadyOn={alreadyOn}
          domains={domains}
          email={email}
          providerId={providerId}
          runId={runId}
          onDone={setTestState}
        />
      )}

      <DialogFooter>
        {step === 'provider' && (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => setStep('connect')}>Continue</Button>
          </>
        )}
        {step === 'connect' && (
          <>
            <Button variant="outline" onClick={() => (alreadyOn ? onClose() : setStep('provider'))}>
              {alreadyOn ? 'Cancel' : 'Back'}
            </Button>
            <Button disabled={!allVerified} onClick={startTest}>
              Test connection
            </Button>
          </>
        )}
        {step === 'test' && testState === 'failed' && (
          <>
            <Button variant="outline" onClick={() => setStep('connect')}>
              Edit details
            </Button>
            <Button onClick={startTest}>Try again</Button>
          </>
        )}
        {step === 'test' && testState !== 'failed' && (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={testState === 'running'} onClick={turnOn}>
              {alreadyOn ? 'Done' : 'Turn on SSO'}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

export function SsoSetupModal({ open, ...props }: SetupFlowProps & { open: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && props.onClose()}>
      <DialogContent className="max-w-xl">
        <SetupFlow {...props} />
      </DialogContent>
    </Dialog>
  );
}
