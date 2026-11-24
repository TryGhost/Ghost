import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import {
  Button,
  Field,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupInput,
  Link,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { AuthHeader, FlowMessage, SubmitButton, type SubmitState } from '@/auth/auth-layout';
import { CodeInput, type CodeInputHandle } from '@/auth-prototype/code-input';
import {
  getDemoState,
  updateSignin,
  updateTwoFactor,
  useDemoState,
} from '@/auth-prototype/demo-store';
import {
  MAX_CODE_ATTEMPTS,
  fakeDelay,
  findBackupCode,
  isValidAppCode,
  pauseLength,
} from '@/auth-prototype/fake';
import { useSiteTitle } from '@/auth-prototype/people';
import { DemoShell } from './demo-shell';

function formatWait(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Too many wrong codes in a row: a short pause that doubles each time, never a hard lock. */
function Paused({ until, onEnd }: { until: number; onEnd: () => void }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const remaining = until - now;

  useEffect(() => {
    const interval = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= until) {
        onEnd();
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [until, onEnd]);

  return (
    <DemoShell>
      <Stack gap="lg">
        <AuthHeader title="Too many wrong codes">
          <p className="text-lg text-muted-foreground">
            For your security, try again in{' '}
            <span className="font-medium text-foreground tabular-nums">
              {formatWait(remaining)}
            </span>
            . We’ve emailed you in case this wasn’t you.
          </p>
        </AuthHeader>
        <Button
          className="h-(--control-height) w-full"
          size="lg"
          variant="outline"
          onClick={() => navigate('/auth-demo')}
        >
          Back to sign in
        </Button>
        <Text className="text-center" size="sm" tone="secondary">
          Lost your phone and your backup codes?{' '}
          <Link asChild>
            <button type="button" onClick={() => navigate('/auth-demo/help')}>
              Ask your site Owner or an Administrator
            </button>
          </Link>
        </Text>
      </Stack>
    </DemoShell>
  );
}

function TextAction({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <Link className="self-center text-sm" asChild>
      <button type="button" onClick={onClick}>
        {children}
      </button>
    </Link>
  );
}

/** Flow 4: the authenticator code step, with wrong code (E3) and lockout (E4). */
export function DemoCode() {
  const navigate = useNavigate();
  const siteTitle = useSiteTitle();
  const { signinScenario } = useDemoState();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const codeInput = useRef<CodeInputHandle>(null);
  const { pausedUntil } = signinScenario;
  const [paused, setPaused] = useState(() => pausedUntil !== null && pausedUntil > Date.now());
  const endPause = useCallback(() => setPaused(false), []);

  if (paused && pausedUntil !== null) {
    return <Paused until={pausedUntil} onEnd={endPause} />;
  }

  const verify = async (value = code) => {
    if (value.length !== 6) {
      return;
    }
    setError('');
    setState('running');
    await fakeDelay();
    if (isValidAppCode(value)) {
      updateSignin({ failedCodes: 0, pausedUntil: null, pauses: 0 });
      navigate('/auth-demo/done', { state: { via: 'app' } });
      return;
    }
    const { failedCodes, pauses } = getDemoState().signinScenario;
    if (failedCodes + 1 >= MAX_CODE_ATTEMPTS) {
      updateSignin({
        failedCodes: 0,
        pausedUntil: Date.now() + pauseLength(pauses),
        pauses: pauses + 1,
      });
      setState('idle');
      setCode('');
      setPaused(true);
      return;
    }
    updateSignin({ failedCodes: failedCodes + 1 });
    setState('failed');
    setError('That code didn’t work. Codes change every 30 seconds, so try the newest one.');
    setCode('');
    codeInput.current?.clear();
  };

  return (
    <DemoShell>
      <form
        noValidate
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void verify();
        }}
      >
        <Stack gap="lg">
          <AuthHeader title="Enter your code">
            <p className="text-lg text-muted-foreground">
              Open your authenticator app and enter the 6-digit code for {siteTitle}.
            </p>
          </AuthHeader>
          <CodeInput
            ref={codeInput}
            disabled={state === 'running'}
            invalid={Boolean(error)}
            size="lg"
            autoFocus
            onChange={(value) => {
              setCode(value);
              setError('');
              if (state === 'failed') {
                setState('idle');
              }
            }}
            onComplete={(value) => void verify(value)}
          />
          <SubmitButton label="Verify →" showRetry={false} state={state} accent />
          <TextAction onClick={() => navigate('/auth-demo/backup')}>Use a backup code</TextAction>
        </Stack>
      </form>
      <FlowMessage error={Boolean(error)}>{error}</FlowMessage>
    </DemoShell>
  );
}

/** Flow 4: sign in with a backup code. Each one works once. */
export function DemoBackup() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setError('Enter one of your backup codes');
      setState('failed');
      return;
    }
    setError('');
    setState('running');
    await fakeDelay();
    const { backupCodes } = getDemoState().twoFactor;
    const match = findBackupCode(code, backupCodes);
    if (!match) {
      setState('failed');
      setError('That backup code didn’t work, or it has already been used.');
      return;
    }
    const remaining = backupCodes.filter((candidate) => candidate !== match);
    updateTwoFactor({ backupCodes: remaining });
    updateSignin({ failedCodes: 0, pausedUntil: null, pauses: 0 });
    toast.success(`Backup code used. ${remaining.length} left.`, {
      description: 'We’ve emailed you to let you know.',
    });
    navigate('/auth-demo/done', { state: { via: 'backup' } });
  };

  return (
    <DemoShell>
      <form noValidate onSubmit={(event) => void verify(event)}>
        <Stack gap="lg">
          <AuthHeader title="Enter a backup code">
            <p className="text-lg text-muted-foreground">
              Use one of the codes you saved when you set up your authenticator app.
            </p>
          </AuthHeader>
          <Field>
            <FieldLabel htmlFor="demo-backup-code">Backup code</FieldLabel>
            <Input
              aria-invalid={Boolean(error) || undefined}
              autoComplete="off"
              className="font-mono"
              id="demo-backup-code"
              placeholder="xxxx-xxxx"
              value={code}
              autoFocus
              data-1p-ignore
              onChange={(event) => {
                setCode(event.target.value);
                setError('');
                setState('idle');
              }}
            />
          </Field>
          <SubmitButton label="Verify →" showRetry={false} state={state} accent />
          <Stack align="center" gap="xs">
            <TextAction onClick={() => navigate('/auth-demo/code')}>
              Use your authenticator app instead
            </TextAction>
            <TextAction onClick={() => navigate('/auth-demo/help')}>Can’t get a code?</TextAction>
          </Stack>
        </Stack>
      </form>
      <FlowMessage error={Boolean(error)}>{error}</FlowMessage>
    </DemoShell>
  );
}

/** Today's emailed-code step, for staff who use email codes. */
export function DemoEmailCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Verification code must be 6 numbers');
      setState('failed');
      return;
    }
    setError('');
    setState('running');
    await fakeDelay();
    if (!isValidAppCode(trimmed)) {
      setError('Your verification code is incorrect.');
      setState('failed');
      return;
    }
    navigate('/auth-demo/done', { state: { via: 'email' } });
  };

  return (
    <DemoShell>
      <form noValidate onSubmit={(event) => void verify(event)}>
        <Stack gap="lg">
          <AuthHeader title="Verify it’s really you">
            <p className="text-lg text-muted-foreground">
              A <span className="whitespace-nowrap">6-digit</span>{' '}
              <span className="whitespace-nowrap">sign-in</span> verification code has been sent to
              your email to keep your account safe.
            </p>
          </AuthHeader>
          <Field>
            <FieldLabel htmlFor="demo-email-code">Verification code</FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={Boolean(error) || undefined}
                autoComplete="off"
                id="demo-email-code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="• • • • • •"
                type="text"
                value={code}
                data-1p-ignore
                onChange={(event) => {
                  setCode(event.target.value);
                  setError('');
                  setState('idle');
                }}
              />
            </InputGroup>
          </Field>
          <SubmitButton label="Verify →" showRetry={false} state={state} accent />
          <Text className="text-center" size="sm" tone="secondary">
            Prototype: any 6 digits work except 000000.
          </Text>
        </Stack>
      </form>
      <FlowMessage error={Boolean(error)}>{error}</FlowMessage>
    </DemoShell>
  );
}
