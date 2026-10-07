import { type FormEvent, useState } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import {
  Field,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { describeUnexpectedError, useAuthClient } from './client/auth-client';
import { AuthHeader, AuthLayout, FlowMessage, SubmitButton, type SubmitState } from './auth-layout';
import { reloadAdmin } from './reload';
import { ResendCodeButton } from './resend-code-button';
import { takeSigninRedirect } from './signin-redirect';

export default function SigninVerify() {
  const authClient = useAuthClient();
  const { state } = useLocation() as { state: { twoFactorReason?: string } | null };
  const twoFactorRequired = state?.twoFactorReason === 'required';

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [flowError, setFlowError] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const failWith = (message: string, setMessage: (message: string) => void) => {
    setMessage(message);
    setSubmitState('failed');
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setFlowError('');
    setCodeError('');

    const trimmed = code.trim();
    if (!trimmed) {
      return failWith('Verification code is required', setCodeError);
    }
    if (!/^\d{6}$/.test(trimmed)) {
      return failWith('Verification code must be 6 numbers', setCodeError);
    }

    setSubmitState('running');
    try {
      const { error } = await authClient.twoFactor.verifyOtp({ code: trimmed });
      if (!error) {
        reloadAdmin(takeSigninRedirect());
      } else if (error.code === 'INVALID_CODE') {
        failWith('Your verification code is incorrect.', setCodeError);
      } else {
        failWith(error.message ?? '', setFlowError);
      }
    } catch (error) {
      failWith(
        describeUnexpectedError(error, 'There was a problem verifying the code. Please try again.'),
        setFlowError,
      );
    }
  };

  return (
    <AuthLayout>
      <form noValidate onSubmit={(event) => void verify(event)}>
        <Stack gap="lg">
          <AuthHeader title={twoFactorRequired ? '2FA confirmation' : "Verify it's really you"}>
            <p className="text-muted-foreground">
              {twoFactorRequired
                ? 'Enter the sign-in verification code sent to your email.'
                : "It looks like you're signing in from a new device. A 6-digit sign-in verification code has been sent to your email to keep your account safe."}
            </p>
          </AuthHeader>
          <Field>
            <FieldLabel htmlFor="token">Verification code</FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={Boolean(codeError) || undefined}
                autoComplete="one-time-code"
                data-test-input="token"
                id="token"
                inputMode="numeric"
                name="token"
                pattern="[0-9]*"
                placeholder="• • • • • •"
                type="text"
                value={code}
                data-1p-ignore
                onChange={(event) => {
                  setCode(event.target.value);
                  setCodeError('');
                  setFlowError('');
                  setSubmitState('idle');
                }}
              />
              <InputGroupAddon align="inline-end">
                <ResendCodeButton onError={setFlowError} />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <SubmitButton label="Verify →" state={submitState} accent />
        </Stack>
      </form>
      <FlowMessage error={Boolean(flowError || codeError)}>{flowError || codeError}</FlowMessage>
    </AuthLayout>
  );
}
