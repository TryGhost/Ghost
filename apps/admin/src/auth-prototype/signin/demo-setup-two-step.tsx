import { useRef, useState } from 'react';
import { useNavigate } from '@tryghost/admin-x-framework';
import {
  CopyField,
  CopyFieldActions,
  CopyFieldContent,
  CopyFieldCopyButton,
  CopyFieldLabel,
  CopyFieldValue,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { AuthHeader, FlowMessage, SubmitButton, type SubmitState } from '@/auth/auth-layout';
import { CodeInput, type CodeInputHandle } from '@/auth-prototype/code-input';
import { updateTwoFactor } from '@/auth-prototype/demo-store';
import { AUTHENTICATOR_KEY, BACKUP_CODES, fakeDelay, isValidAppCode } from '@/auth-prototype/fake';
import { useSiteTitle } from '@/auth-prototype/people';
import { BackupCodes } from '@/auth-prototype/two-factor/backup-codes';
import { QrPlaceholder } from '@/auth-prototype/two-factor/qr-placeholder';
import { DemoShell } from './demo-shell';

/**
 * The site requires two-step verification and this person hasn't set it up:
 * after their password, they set it up before they get in. Same steps as the
 * Security tab, on the sign-in page.
 */
export default function DemoSetupTwoStep() {
  const navigate = useNavigate();
  const siteTitle = useSiteTitle();
  const [step, setStep] = useState<'scan' | 'codes'>('scan');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const codeInput = useRef<CodeInputHandle>(null);

  const verify = async (value = code) => {
    if (value.length !== 6) {
      return;
    }
    setError('');
    setState('running');
    await fakeDelay();
    if (!isValidAppCode(value)) {
      setState('failed');
      setError('That code didn’t work. Try the newest code in your app.');
      codeInput.current?.clear();
      return;
    }
    setState('idle');
    setStep('codes');
  };

  if (step === 'codes') {
    return (
      <DemoShell>
        <Stack gap="lg">
          <AuthHeader title="Save your backup codes" />
          <BackupCodes
            codes={BACKUP_CODES}
            finishLabel="Continue to Ghost"
            siteTitle={siteTitle}
            onFinish={() => {
              updateTwoFactor({
                method: 'app',
                backupCodes: [...BACKUP_CODES],
                addedAt: new Date().toISOString(),
              });
              toast.success('Two-step verification is on', {
                description: 'We’ve emailed you to let you know.',
              });
              navigate('/auth-demo/done', { state: { via: 'setup' } });
            }}
          />
        </Stack>
      </DemoShell>
    );
  }

  return (
    <DemoShell>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void verify();
        }}
      >
        <Stack gap="lg">
          <AuthHeader title="Set up two-step verification">
            <p className="text-lg text-muted-foreground">
              {siteTitle} requires it for all staff. Scan this code with an authenticator app like
              1Password or Authy, then enter the 6-digit code it shows.
            </p>
          </AuthHeader>
          <Stack align="center" gap="md">
            <div className="rounded-lg border border-border-default bg-surface-elevated p-3 text-foreground">
              <QrPlaceholder className="size-36" />
            </div>
          </Stack>
          <CopyField value={AUTHENTICATOR_KEY.replace(/\s/g, '')}>
            <CopyFieldLabel>Can’t scan? Enter this key instead:</CopyFieldLabel>
            <CopyFieldContent>
              <CopyFieldValue className="font-mono tracking-wider text-foreground">
                {AUTHENTICATOR_KEY}
              </CopyFieldValue>
              <CopyFieldActions>
                <CopyFieldCopyButton />
              </CopyFieldActions>
            </CopyFieldContent>
          </CopyField>
          <CodeInput
            ref={codeInput}
            disabled={state === 'running'}
            invalid={Boolean(error)}
            size="lg"
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
          <Text className="text-center" size="sm" tone="secondary">
            Prototype: any 6 digits work except 000000.
          </Text>
        </Stack>
      </form>
      <FlowMessage error={Boolean(error)}>{error}</FlowMessage>
    </DemoShell>
  );
}
