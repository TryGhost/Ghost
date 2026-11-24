import { type ReactNode, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
  Link,
  LoadingIndicator,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { CodeInput, type CodeInputHandle } from '@/auth-prototype/code-input';
import { fakeDelay, findBackupCode, isValidAppCode } from '@/auth-prototype/fake';
import { updateTwoFactor, useDemoState } from '@/auth-prototype/demo-store';

/**
 * A confirmation that needs a current authenticator code (or, when allowed,
 * a backup code). Shared by "Get new codes" and "Turn off".
 */
interface CodeConfirmProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  allowBackupCode?: boolean;
  onConfirmed: () => void;
}

/** The dialog's body. It mounts fresh on each open, so every open starts clean. */
function CodeConfirmBody({
  title,
  description,
  confirmLabel,
  destructive = false,
  allowBackupCode = false,
  onConfirmed,
}: CodeConfirmProps) {
  const demo = useDemoState();
  const [mode, setMode] = useState<'app' | 'backup'>('app');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const codeInput = useRef<CodeInputHandle>(null);

  const verify = async (value = code) => {
    setError('');
    setRunning(true);
    await fakeDelay();
    setRunning(false);

    if (mode === 'app') {
      if (!isValidAppCode(value)) {
        setError('That code didn’t work. Try the newest code in your app.');
        codeInput.current?.clear();
        return;
      }
    } else {
      const match = findBackupCode(value, demo.twoFactor.backupCodes);
      if (!match) {
        setError('That backup code didn’t work, or it has already been used.');
        return;
      }
      updateTwoFactor({
        backupCodes: demo.twoFactor.backupCodes.filter((candidate) => candidate !== match),
      });
    }
    onConfirmed();
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>{description}</div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void verify();
        }}
      >
        <Stack gap="sm">
          {mode === 'app' ? (
            <>
              <Text size="sm" weight="medium">
                Enter the 6-digit code from your authenticator app
              </Text>
              <CodeInput
                ref={codeInput}
                disabled={running}
                invalid={Boolean(error)}
                autoFocus
                onChange={(value) => {
                  setCode(value);
                  setError('');
                }}
                onComplete={(value) => void verify(value)}
              />
            </>
          ) : (
            <>
              <Text as="label" size="sm" weight="medium">
                Backup code
              </Text>
              <Input
                aria-invalid={Boolean(error) || undefined}
                aria-label="Backup code"
                autoComplete="off"
                className="font-mono"
                placeholder="xxxx-xxxx"
                value={code}
                autoFocus
                data-1p-ignore
                onChange={(event) => {
                  setCode(event.target.value);
                  setError('');
                }}
              />
            </>
          )}
          <Text className="min-h-5 text-destructive" role="alert" size="sm">
            {error}
          </Text>
          {allowBackupCode && (
            <Link className="self-start text-sm" asChild>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'app' ? 'backup' : 'app');
                  setCode('');
                  setError('');
                }}
              >
                {mode === 'app'
                  ? 'Lost your device? Use a backup code'
                  : 'Use your authenticator app instead'}
              </button>
            </Link>
          )}
        </Stack>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <Button
            disabled={running || (mode === 'app' ? code.length !== 6 : !code.trim())}
            type="submit"
            variant={destructive ? 'destructive' : 'default'}
          >
            {running ? <LoadingIndicator color="light" size="sm" /> : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </form>
    </>
  );
}

export function CodeConfirmDialog({
  open,
  onCancel,
  ...props
}: CodeConfirmProps & { open: boolean; onCancel: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <CodeConfirmBody {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}
