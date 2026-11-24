import { type FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from '@tryghost/admin-x-framework';
import { Field, FieldLabel, Input, Link } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { AuthHeader, FlowMessage, SubmitButton, type SubmitState } from '@/auth/auth-layout';
import { getDemoState, isSsoConfigured } from '@/auth-prototype/demo-store';
import { emailDomain, fakeDelay } from '@/auth-prototype/fake';
import { useSiteTitle } from '@/auth-prototype/people';
import { DemoShell } from './demo-shell';
import { setDemoEmail, useIsOwnerEmail } from './session';

/** Flows 2 and 4, step 1: ask for the email first, then pick the way in. */
export default function DemoSignin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const siteTitle = useSiteTitle();
  const isOwnerEmail = useIsOwnerEmail();
  const [email, setEmail] = useState(params.get('as') ?? '');
  const [error, setError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      setState('failed');
      return;
    }
    setError('');
    setState('running');
    await fakeDelay(500);
    setDemoEmail(trimmed);

    const { sso } = getDemoState();
    const usesSso = isSsoConfigured(sso) && sso.domains.includes(emailDomain(trimmed));
    // The owner of an SSO domain still sees the SSO screen, with the owner's way out.
    if (usesSso) {
      navigate('/auth-demo/sso');
    } else {
      navigate('/auth-demo/password', { state: { owner: isOwnerEmail(trimmed) } });
    }
  };

  return (
    <DemoShell>
      <form noValidate onSubmit={(event) => void submit(event)}>
        <Stack gap="lg">
          <AuthHeader title={`Sign in to ${siteTitle}`} />
          <Field>
            <FieldLabel htmlFor="demo-email">Email address</FieldLabel>
            <Input
              aria-invalid={Boolean(error) || undefined}
              autoComplete="off"
              id="demo-email"
              placeholder="jamie@example.com"
              type="email"
              value={email}
              autoFocus
              data-1p-ignore
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setState('idle');
              }}
            />
          </Field>
          <SubmitButton label="Continue" showRetry={false} state={state} accent />
          <Link
            className="self-center text-sm"
            href="#"
            onClick={(event) => event.preventDefault()}
          >
            Forgot your email?
          </Link>
        </Stack>
      </form>
      <FlowMessage error={Boolean(error)}>{error}</FlowMessage>
    </DemoShell>
  );
}
