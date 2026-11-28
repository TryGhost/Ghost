import { useEffect, useRef, useState } from 'react';
import { InputGroupButton, LoadingIndicator } from '@tryghost/shade/components';
import { describeUnexpectedError, useAuthClient } from './client/auth-client';

const RESEND_COOLDOWN_MS = 15_000;
const RESEND_FAILED = 'There was a problem resending the verification token.';

interface ResendCodeButtonProps {
  onSent?: () => void;
  /** Receives the text to show when no code went out. */
  onError: (message: string) => void;
}

/** Emails a fresh sign-in code, then holds for the cooldown. Sits in the code's input group. */
export function ResendCodeButton({ onSent, onError }: ResendCodeButtonProps) {
  const authClient = useAuthClient();
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (state !== 'sent') {
      return;
    }
    const timeout = setTimeout(() => setState('idle'), RESEND_COOLDOWN_MS);
    return () => clearTimeout(timeout);
  }, [state]);

  const fail = (message: string) => {
    if (mounted.current) {
      onError(message);
      setState('idle');
    }
  };

  const resend = async () => {
    setState('sending');
    try {
      const { error } = await authClient.twoFactor.sendOtp();
      if (error) {
        fail(error.message ?? RESEND_FAILED);
      } else if (mounted.current) {
        setState('sent');
        onSent?.();
      }
    } catch (error) {
      fail(describeUnexpectedError(error, RESEND_FAILED));
    }
  };

  return (
    <InputGroupButton disabled={state !== 'idle'} onClick={() => void resend()}>
      {state === 'sending' && <LoadingIndicator size="sm" />}
      {state === 'idle' && 'Resend'}
      {state === 'sending' && 'Sending'}
      {state === 'sent' && 'Sent'}
    </InputGroupButton>
  );
}
