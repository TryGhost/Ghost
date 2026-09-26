import { type FormEvent, type RefObject, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from '@tryghost/shade/components';
import {
  isTwoFactorRequiredError,
  useAddSession,
  useVerifySession,
} from '@tryghost/admin-x-framework/api/session';
import { JSONError, UnauthorizedError } from '@tryghost/admin-x-framework/errors';
import { editorReauthDialog } from '@tryghost/test-data/selectors/editor';
import { EDITOR_CONFIRM_DIALOG_LAYER } from '@/editor/layering';

export interface ReauthDialogProps {
  open: boolean;
  /** The signed-in writer's email, which the session is re-created for. */
  email: string;
  onSucceeded: () => void;
  onAbandoned: () => void;
}

type Step = { kind: 'password' } | { kind: 'verify'; newDevice: boolean };

const PASSWORD_REQUIRED = 'Please enter a password';
const SIGN_IN_FAILED = 'Couldn’t sign in. Please try again.';
const CODE_REQUIRED = 'Verification code is required';
const CODE_FORMAT = 'Verification code must be 6 numbers';
const CODE_INCORRECT = 'Your verification code is incorrect.';
const VERIFY_FAILED = 'There was a problem verifying the code. Please try again.';

function apiMessage(error: unknown): string | undefined {
  return error instanceof JSONError ? error.data?.errors?.[0]?.message : undefined;
}

function twoFactorStep(error: JSONError): Step {
  return {
    kind: 'verify',
    newDevice: error.data?.errors?.[0]?.code === '2FA_NEW_DEVICE_DETECTED',
  };
}

interface ReauthFormProps {
  email: string;
  passwordRef: RefObject<HTMLInputElement>;
  onSucceeded: () => void;
}

// Mounted only while the dialog is open, so every opening starts from the password step.
function ReauthForm({ email, passwordRef, onSucceeded }: ReauthFormProps) {
  const { mutateAsync: addSession } = useAddSession();
  const { mutateAsync: verifySession } = useVerifySession();
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (step.kind === 'verify') {
      tokenRef.current?.focus();
    }
  }, [step.kind]);

  const submitPassword = async () => {
    if (!password) {
      setError(PASSWORD_REQUIRED);
      return;
    }
    setSubmitting(true);
    try {
      await addSession({ username: email, password });
      if (mounted.current) {
        onSucceeded();
      }
    } catch (caught) {
      if (!mounted.current) {
        return;
      }
      if (isTwoFactorRequiredError(caught)) {
        setStep(twoFactorStep(caught));
        return;
      }
      setError(apiMessage(caught) ?? SIGN_IN_FAILED);
    } finally {
      if (mounted.current) {
        setSubmitting(false);
      }
    }
  };

  const submitToken = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setError(CODE_REQUIRED);
      return;
    }
    if (!/^\d{6}$/.test(trimmed)) {
      setError(CODE_FORMAT);
      return;
    }
    setSubmitting(true);
    try {
      await verifySession({ token: trimmed });
      if (mounted.current) {
        onSucceeded();
      }
    } catch (caught) {
      if (!mounted.current) {
        return;
      }
      if (caught instanceof UnauthorizedError) {
        setError(CODE_INCORRECT);
        return;
      }
      setError(apiMessage(caught) ?? VERIFY_FAILED);
    } finally {
      if (mounted.current) {
        setSubmitting(false);
      }
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError(null);
    void (step.kind === 'password' ? submitPassword() : submitToken());
  };

  if (step.kind === 'verify') {
    return (
      <form noValidate onSubmit={onSubmit}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step.newDevice ? 'Verify it’s really you' : '2FA confirmation'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step.newDevice
              ? 'It looks like you’re signing in from a new device. A 6-digit sign-in verification code has been sent to your email to keep your account safe.'
              : 'Enter the sign-in verification code sent to your email.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup className="py-6">
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="reauth-token">Verification code</FieldLabel>
            <Input
              ref={tokenRef}
              aria-invalid={error ? true : undefined}
              autoComplete="one-time-code"
              id="reauth-token"
              inputMode="numeric"
              name="token"
              pattern="[0-9]*"
              placeholder="• • • • • •"
              value={token}
              data-1p-ignore
              onChange={(event) => {
                setError(null);
                setToken(event.target.value);
              }}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button disabled={submitting} variant="outline">
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button disabled={submitting} type="submit">
            {submitting ? 'Verifying…' : 'Verify'}
          </Button>
        </AlertDialogFooter>
      </form>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you still here?</AlertDialogTitle>
        <AlertDialogDescription>
          Your authenticated session expired. Enter your password to continue where you left off.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <FieldGroup className="gap-4 py-6">
        <Field>
          <FieldLabel htmlFor="reauth-email">Email</FieldLabel>
          <Input
            autoComplete="username"
            id="reauth-email"
            name="username"
            type="email"
            value={email}
            readOnly
          />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="reauth-password">Password</FieldLabel>
          <Input
            ref={passwordRef}
            aria-invalid={error ? true : undefined}
            autoComplete="current-password"
            id="reauth-password"
            name="password"
            placeholder="•••••••••••••••"
            type="password"
            value={password}
            onChange={(event) => {
              setError(null);
              setPassword(event.target.value);
            }}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </FieldGroup>
      <AlertDialogFooter>
        <AlertDialogCancel asChild>
          <Button disabled={submitting} variant="outline">
            Cancel
          </Button>
        </AlertDialogCancel>
        <Button disabled={submitting} type="submit">
          {submitting ? 'Authenticating…' : 'Sign in'}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

/** Escape and Cancel abandon; the backdrop does nothing. */
export function ReauthDialog({ open, email, onSucceeded, onAbandoned }: ReauthDialogProps) {
  const passwordRef = useRef<HTMLInputElement>(null);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onAbandoned();
        }
      }}
    >
      <AlertDialogContent
        className={EDITOR_CONFIRM_DIALOG_LAYER}
        data-testid={editorReauthDialog}
        overlayClassName={EDITOR_CONFIRM_DIALOG_LAYER}
        // The alert dialog would focus Cancel; the writer is here to type a password.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          passwordRef.current?.focus();
        }}
      >
        <ReauthForm email={email} passwordRef={passwordRef} onSucceeded={onSucceeded} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
