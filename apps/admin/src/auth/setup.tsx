import { type ComponentProps, type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { Field, FieldError, FieldLabel, GhostOrb, Input } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import validator from 'validator';
import { type SetupStatus, useAuthClient, useSetupStatus } from './client/auth-client';
import { AuthLayout, FlowMessage, SubmitButton, type SubmitState } from './auth-layout';
import { passwordProblems } from './password-rules';
import { reloadAdmin } from './reload';

type SetupField = 'blogTitle' | 'name' | 'email' | 'password';
type SetupValues = Record<SetupField, string>;

export default function Setup() {
  const { data: status, isPending } = useSetupStatus();

  if (isPending) {
    return null;
  }
  if (status?.isSetup) {
    return <Navigate to="/signin" replace />;
  }
  return <SetupForm prefill={status} />;
}

const problemWith = (field: SetupField, values: SetupValues, siteUrl?: string) => {
  switch (field) {
    case 'blogTitle':
      if (!values.blogTitle) {
        return 'Please enter a site title.';
      }
      return values.blogTitle.length > 150 ? 'Title is too long' : undefined;
    case 'name':
      return values.name ? undefined : 'Please enter a name.';
    case 'email':
      if (!values.email.trim()) {
        return 'Please enter an email.';
      }
      return validator.isEmail(values.email) ? undefined : 'Invalid Email.';
    case 'password':
      return passwordProblems(values.password, {
        email: values.email,
        siteTitle: values.blogTitle,
        siteUrl,
      })[0];
  }
};

const FIELDS: SetupField[] = ['blogTitle', 'name', 'email', 'password'];

function SetupForm({ prefill }: { prefill?: SetupStatus }) {
  const authClient = useAuthClient();
  const navigate = useNavigate();
  const { data: siteData } = useBrowseSite({ defaultErrorHandler: false });

  const [values, setValues] = useState<SetupValues>({
    blogTitle: prefill?.title ?? '',
    name: prefill?.name ?? '',
    email: prefill?.email ?? '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<SetupField, string>>>({});
  const [flowError, setFlowError] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const setValue = (field: SetupField, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  // Checked on leaving a field only once something was typed, so tabbing
  // through the empty form stays quiet.
  const checkOnBlur = (field: SetupField, nextValues = values) => {
    if (nextValues[field]) {
      setErrors((current) => ({
        ...current,
        [field]: problemWith(field, nextValues, siteData?.site.url),
      }));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFlowError('');

    const nextErrors = Object.fromEntries(
      FIELDS.map((field) => [field, problemWith(field, values, siteData?.site.url)]),
    );
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setFlowError('Please fill out every field correctly to set up your site.');
      return;
    }

    setSubmitState('running');
    const { blogTitle, name, email, password } = values;
    try {
      const created = await authClient.setup.create({ blogTitle, name, email, password });
      if (created.error) {
        if (created.error.status === 422) {
          setFlowError(created.error.message ?? '');
        } else {
          toast.error(created.error.message ?? 'There was a problem setting up your site.');
        }
        setSubmitState('idle');
        return;
      }

      const { data, error } = await authClient.signIn.email({ email, password });
      if (data && 'twoFactorRedirect' in data) {
        navigate('/signin/verify', { state: { twoFactorReason: data.twoFactorReason } });
      } else if (data) {
        reloadAdmin('/?firstStart=true');
      } else {
        setFlowError(error.message ?? '');
        setSubmitState('idle');
      }
    } catch {
      toast.error('There was a problem on the server.');
      setSubmitState('idle');
    }
  };

  const field = (
    name: SetupField,
    label: string,
    input: Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur'>,
    trimOnBlur = false,
  ) => (
    <Field data-invalid={Boolean(errors[name]) || undefined}>
      <FieldLabel htmlFor={input.id}>{label}</FieldLabel>
      <Input
        aria-invalid={Boolean(errors[name]) || undefined}
        autoCorrect="off"
        value={values[name]}
        onBlur={() => {
          const nextValues = trimOnBlur ? { ...values, [name]: values[name].trim() } : values;
          setValues(nextValues);
          checkOnBlur(name, nextValues);
        }}
        onChange={(event) => setValue(name, event.target.value)}
        {...input}
      />
      <FieldError>{errors[name]}</FieldError>
    </Field>
  );

  return (
    <AuthLayout>
      <header className="flex flex-col items-center gap-3 text-center">
        <GhostOrb aria-label="Ghost" className="size-18" />
        <h1 className="text-4xl leading-tight font-bold tracking-tight text-foreground">
          Welcome to Ghost.
        </h1>
        <p className="text-lg text-muted-foreground">
          All over the world, people have started 3,000,000+ incredible sites with Ghost. Today,
          we’re starting yours.
        </p>
      </header>
      <form noValidate onSubmit={(event) => void submit(event)}>
        <Stack gap="lg">
          {field(
            'blogTitle',
            'Site title',
            {
              autoFocus: true,
              id: 'blog-title',
              name: 'blog-title',
              placeholder: 'The Daily Awesome',
            },
            true,
          )}
          {field('name', 'Full name', {
            autoComplete: 'name',
            id: 'name',
            name: 'name',
            placeholder: 'Jamie Larson',
          })}
          {field('email', 'Email address', {
            autoComplete: 'username',
            id: 'email',
            name: 'email',
            placeholder: 'jamie@example.com',
            type: 'email',
          })}
          {field('password', 'Password', {
            autoComplete: 'new-password',
            id: 'password',
            name: 'password',
            placeholder: 'At least 10 characters',
            type: 'password',
          })}
          <SubmitButton
            label="Create account & start publishing →"
            showRetry={false}
            state={submitState}
          />
        </Stack>
      </form>
      {flowError && <FlowMessage error>{flowError}</FlowMessage>}
    </AuthLayout>
  );
}
