import { type FormEvent, useState } from 'react';
import { useParams } from '@tryghost/admin-x-framework';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { Input } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { toast } from 'sonner';
import { useAuthClient } from './client/auth-client';
import { AuthHeader, AuthLayout, FlowMessage, SubmitButton, type SubmitState } from './auth-layout';
import { leaveAuthNotice } from './auth-notice';
import { passwordProblems } from './password-rules';
import { reloadAdmin } from './reload';
import { takeSigninRedirect } from './signin-redirect';

export default function Reset() {
  const authClient = useAuthClient();
  const { token = '' } = useParams();
  const { data: siteData } = useBrowseSite({ defaultErrorHandler: false });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invalid, setInvalid] = useState<{ newPassword?: boolean; confirmPassword?: boolean }>({});
  const [flowError, setFlowError] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  const clearErrors = () => {
    setFlowError('');
    setInvalid({});
  };

  const validate = () => {
    const newPasswordErrors = newPassword ? [] : ['Please enter a password.'];
    const mismatch = newPassword && newPassword !== confirmPassword;
    newPasswordErrors.push(
      ...passwordProblems(newPassword, {
        email: authClient.getResetTokenEmail(token) ?? '',
        siteTitle: siteData?.site.title,
        siteUrl: siteData?.site.url,
      }),
    );
    setInvalid({ newPassword: newPasswordErrors.length > 0, confirmPassword: Boolean(mismatch) });
    return mismatch ? "The two new passwords don't match." : newPasswordErrors[0];
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setFlowError('');

    const problem = validate();
    if (problem) {
      setFlowError(problem);
      setSubmitState('failed');
      return;
    }

    setSubmitState('running');
    try {
      const { data, error } = await authClient.resetPassword({ newPassword, token });
      if (error) {
        toast.error(error.message ?? 'There was a problem resetting your password.');
        setSubmitState('failed');
        return;
      }
      if (data.message) {
        leaveAuthNotice(data.message);
      }
      reloadAdmin(takeSigninRedirect());
    } catch {
      toast.error('There was a problem on the server.');
      setSubmitState('failed');
    }
  };

  return (
    <AuthLayout>
      <form noValidate onSubmit={(event) => void save(event)}>
        <Stack gap="lg">
          <AuthHeader title="Reset your password." />
          <Input
            aria-invalid={invalid.newPassword || undefined}
            aria-label="New password"
            autoCorrect="off"
            name="newPassword"
            placeholder="New password"
            type="password"
            value={newPassword}
            autoFocus
            onChange={(event) => {
              clearErrors();
              setNewPassword(event.target.value);
            }}
          />
          <Input
            aria-invalid={invalid.confirmPassword || undefined}
            aria-label="Confirm new password"
            autoCorrect="off"
            name="ne2Password"
            placeholder="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              clearErrors();
              setConfirmPassword(event.target.value);
            }}
          />
          <SubmitButton label="Save new password" state={submitState} />
        </Stack>
      </form>
      <FlowMessage error>{flowError}</FlowMessage>
    </AuthLayout>
  );
}
