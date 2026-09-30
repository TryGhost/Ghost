import { type FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { Field, FieldError, FieldLabel, Input } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { describeUnexpectedError, useAuthClient, useInvitation } from './client/auth-client';
import { AuthHeader, AuthLayout, FlowMessage, SubmitButton, type SubmitState } from './auth-layout';
import { passwordProblems } from './password-rules';
import { reloadAdmin } from './reload';
import { takeSigninRedirect } from './signin-redirect';

type SignupField = 'name' | 'password';

export default function Signup() {
  const { token = '' } = useParams();
  const { data: invitation, isPending } = useInvitation(token);

  const invalidToken = invitation?.email === null;
  const invalidInvitation = invitation?.email && !invitation.valid;
  const rejected = invalidToken || invalidInvitation;

  useEffect(() => {
    if (invalidToken) {
      toast.error('Invalid token.', { id: 'signup-rejected' });
    } else if (invalidInvitation) {
      toast.warning('The invitation does not exist or is no longer valid.', {
        id: 'signup-rejected',
      });
    }
  }, [invalidToken, invalidInvitation]);

  if (isPending || !invitation) {
    return null;
  }
  if (rejected || !invitation.email) {
    return <Navigate to="/signin" replace />;
  }
  return <SignupForm email={invitation.email} token={token} />;
}

function SignupForm({ email, token }: { email: string; token: string }) {
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const { data: siteData } = useBrowseSite({ defaultErrorHandler: false });

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<SignupField, string>>>({});
  const [flowError, setFlowError] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const problemWith = (field: SignupField, values = { name, password }) => {
    if (field === 'name') {
      return values.name ? undefined : 'Please enter a name.';
    }
    return passwordProblems(values.password, { email, siteTitle: siteData?.site.title })[0];
  };

  const validateField = (field: SignupField, values?: { name: string; password: string }) =>
    setErrors((current) => ({ ...current, [field]: problemWith(field, values) }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFlowError('');

    const nextErrors = { name: problemWith('name'), password: problemWith('password') };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.password) {
      setFlowError('Please fill out the form to complete your signup');
      setSubmitState('failed');
      return;
    }

    setSubmitState('running');
    let accountCreated = false;
    try {
      const accepted = await authClient.invitation.accept({ token, name, password });
      if (accepted.error) {
        setFlowError(accepted.error.message ?? '');
        setSubmitState('failed');
        return;
      }
      accountCreated = true;

      const { data, error } = await authClient.signIn.email({ email, password });
      if (data && 'twoFactorRedirect' in data) {
        navigate('/signin/verify', { state: { twoFactorReason: data.twoFactorReason } });
      } else if (data) {
        reloadAdmin(takeSigninRedirect());
      } else {
        toast.error(error.message ?? 'An unexpected error occurred, please try again.', {
          id: 'signup',
        });
        navigate('/signin', { replace: true });
      }
    } catch (error) {
      toast.error(
        describeUnexpectedError(error, 'An unexpected error occurred, please try again.'),
        { id: 'signup' },
      );
      // The account exists now, so submitting again could only fail.
      if (accountCreated) {
        navigate('/signin', { replace: true });
      } else {
        setSubmitState('failed');
      }
    }
  };

  return (
    <AuthLayout>
      <AuthHeader title="Create your account." />
      <form noValidate onSubmit={(event) => void submit(event)}>
        <Stack gap="lg">
          <Field data-invalid={Boolean(errors.name) || undefined}>
            <FieldLabel htmlFor="display-name">Full name</FieldLabel>
            <Input
              aria-invalid={Boolean(errors.name) || undefined}
              autoComplete="name"
              autoCorrect="off"
              data-test-input="name"
              id="display-name"
              name="display-name"
              placeholder="Jamie Larson"
              type="text"
              value={name}
              onBlur={() => {
                const trimmed = name.trim();
                setName(trimmed);
                validateField('name', { name: trimmed, password });
              }}
              onChange={(event) => setName(event.target.value)}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="username">Email address</FieldLabel>
            <Input
              autoComplete="username"
              data-test-input="email"
              id="username"
              name="username"
              type="text"
              value={email}
              disabled
              readOnly
            />
          </Field>
          <Field data-invalid={Boolean(errors.password) || undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              aria-invalid={Boolean(errors.password) || undefined}
              autoComplete="new-password"
              autoCorrect="off"
              data-test-input="password"
              id="password"
              name="password"
              placeholder="At least 10 characters"
              type="password"
              value={password}
              onBlur={() => validateField('password')}
              onChange={(event) => setPassword(event.target.value)}
            />
            <FieldError>{errors.password}</FieldError>
          </Field>
          <SubmitButton
            label="Create Account →"
            runningLabel="Creating"
            state={submitState}
            accent
          />
        </Stack>
      </form>
      {flowError && <FlowMessage error>{flowError}</FlowMessage>}
    </AuthLayout>
  );
}
