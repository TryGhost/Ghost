import { useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Banner,
  Button,
  CopyField,
  CopyFieldActions,
  CopyFieldContent,
  CopyFieldCopyButton,
  CopyFieldLabel,
  CopyFieldValue,
  Link,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { CodeInput, type CodeInputHandle } from '@/auth-prototype/code-input';
import { AUTHENTICATOR_KEY, fakeDelay, isValidAppCode } from '@/auth-prototype/fake';
import { BackupCodes } from './backup-codes';
import { QrPlaceholder } from './qr-placeholder';

export type SetupStep = 'scan' | 'confirm' | 'codes';

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <AlertDialogHeader>
      <AlertDialogDescription>Step {step} of 3</AlertDialogDescription>
      <AlertDialogTitle>{title}</AlertDialogTitle>
    </AlertDialogHeader>
  );
}

function ScanStep({ onCancel, onNext }: { onCancel: () => void; onNext: () => void }) {
  return (
    <Stack gap="lg">
      <StepHeading step={1} title="Scan the QR code" />
      <Inline align="start" gap="lg" wrap>
        <div className="rounded-lg border border-border-default bg-surface-elevated p-3 text-foreground">
          <QrPlaceholder className="size-40" />
        </div>
        <Stack className="min-w-0 flex-1" gap="md">
          <Text size="md">Open your authenticator app, add a new account, and scan this code.</Text>
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
        </Stack>
      </Inline>
      <AlertDialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onNext}>Next</Button>
      </AlertDialogFooter>
    </Stack>
  );
}

function ConfirmStep({
  onBack,
  onRescan,
  onVerified,
}: {
  onBack: () => void;
  onRescan: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState('');
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const codeInput = useRef<CodeInputHandle>(null);

  const verify = async (value = code) => {
    setFailed(false);
    setRunning(true);
    await fakeDelay();
    setRunning(false);
    if (isValidAppCode(value)) {
      onVerified();
    } else {
      setFailed(true);
    }
  };

  return (
    <Stack gap="lg">
      <StepHeading step={2} title="Confirm with a code" />
      <Text size="md">Enter the 6-digit code your app shows for this site.</Text>
      <CodeInput
        ref={codeInput}
        disabled={running}
        invalid={failed}
        autoFocus
        onChange={(value) => {
          setCode(value);
          setFailed(false);
        }}
        onComplete={(value) => void verify(value)}
      />
      {failed && (
        <Banner role="alert" variant="destructive">
          <Stack gap="xs">
            <Text size="md">
              That code didn’t work. Try the newest code in your app. If it keeps failing, check
              that your phone’s clock is set automatically.
            </Text>
            <Link className="self-start text-sm" asChild>
              <button type="button" onClick={onRescan}>
                Scan the QR code again
              </button>
            </Link>
          </Stack>
        </Banner>
      )}
      <AlertDialogFooter>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button disabled={running || code.length !== 6} onClick={() => void verify()}>
          {running ? <LoadingIndicator color="light" size="sm" /> : 'Verify'}
        </Button>
      </AlertDialogFooter>
    </Stack>
  );
}

type SetupProps = {
  codes: string[];
  siteTitle: string;
  onCancel: () => void;
  onFinish: () => void;
};

/** The dialog's body. It mounts fresh on each open, so every open starts at the QR code. */
function SetupSteps({ codes, siteTitle, onCancel, onFinish }: SetupProps) {
  const [step, setStep] = useState<SetupStep>('scan');

  if (step === 'scan') {
    return <ScanStep onCancel={onCancel} onNext={() => setStep('confirm')} />;
  }
  if (step === 'confirm') {
    return (
      <ConfirmStep
        onBack={() => setStep('scan')}
        onRescan={() => setStep('scan')}
        onVerified={() => setStep('codes')}
      />
    );
  }
  return (
    <Stack gap="lg">
      <StepHeading step={3} title="Save your backup codes" />
      <BackupCodes codes={codes} siteTitle={siteTitle} onFinish={onFinish} />
    </Stack>
  );
}

/**
 * Steps 2 to 4 of flow 3, in their own dialog on top of the staff profile.
 * It's an AlertDialog, as Settings' confirmation modal is, so it sits above
 * the staff profile's legacy modal layer. Clicking outside doesn't close it.
 */
export function AuthenticatorSetupDialog({ open, ...props }: SetupProps & { open: boolean }) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && props.onCancel()}>
      {/* Escape closes only this dialog, not the staff profile behind it. */}
      <AlertDialogContent onEscapeKeyDown={(event) => event.stopPropagation()}>
        <SetupSteps {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
