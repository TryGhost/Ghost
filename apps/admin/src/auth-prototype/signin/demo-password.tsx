import { type FormEvent, useState } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { Field, FieldLabel, Input, Link } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { AuthHeader, FlowMessage, SubmitButton, type SubmitState } from '@/auth/auth-layout';
import { getDemoState } from '@/auth-prototype/demo-store';
import { fakeDelay } from '@/auth-prototype/fake';
import { useSiteTitle } from '@/auth-prototype/people';
import { DemoShell, EmailChip } from './demo-shell';
import { getDemoEmail } from './session';

/** The password step for emails outside the SSO domains (E0), and the owner's fallback (E2). */
export default function DemoPassword() {
  const navigate = useNavigate();
  const location = useLocation() as { state: { owner?: boolean } | null };
  const siteTitle = useSiteTitle();
  const email = getDemoEmail();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Enter your password');
      setState('failed');
      return;
    }
    setError('');
    setState('running');
    await fakeDelay();
    // Anything works as the password. What comes next follows Settings > Security.
    const { twoFactor, policy, signinScenario } = getDemoState();
    const owner = Boolean(location.state?.owner);
    if (twoFactor.method === 'app') {
      navigate('/auth-demo/code', { state: location.state });
    } else if (policy.requireTwoStep) {
      // The site requires two-step and this person hasn't set it up: they do it now.
      navigate('/auth-demo/setup-two-step', { state: location.state });
    } else if (owner || policy.emailCodeEverySignin || signinScenario.newDevice) {
      // The owner's way round SSO always needs a code; otherwise only a new
      // device does, unless the site asks for one every time.
      const reason = owner ? 'owner' : policy.emailCodeEverySignin ? 'every-time' : 'new-device';
      navigate('/auth-demo/email-code', { state: { ...location.state, reason } });
    } else {
      navigate('/auth-demo/done', { state: { via: 'password' } });
    }
  };

  return (
    <DemoShell>
      <form noValidate onSubmit={(event) => void submit(event)}>
        <Stack gap="lg">
          <AuthHeader title={`Sign in to ${siteTitle}`}>
            <EmailChip email={email} />
          </AuthHeader>
          <Field>
            <FieldLabel htmlFor="demo-password">Password</FieldLabel>
            <Input
              aria-invalid={Boolean(error) || undefined}
              autoComplete="off"
              id="demo-password"
              placeholder="Any password works"
              type="password"
              value={password}
              autoFocus
              data-1p-ignore
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
                setState('idle');
              }}
            />
          </Field>
          <SubmitButton label="Sign in →" showRetry={false} state={state} accent />
          <Link
            className="self-center text-sm"
            href="#"
            onClick={(event) => event.preventDefault()}
          >
            Forgot password?
          </Link>
        </Stack>
      </form>
      <FlowMessage error={Boolean(error)}>{error}</FlowMessage>
    </DemoShell>
  );
}
