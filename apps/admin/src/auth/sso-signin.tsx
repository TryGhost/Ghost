import { Button } from '@tryghost/shade/components';
import { Stack } from '@tryghost/shade/primitives';
import { AuthHeader, AuthLayout } from './auth-layout';

/**
 * Replaces the password screens when the SSO adapter turns password sign-in off
 */
export default function SSOSignin({
  title,
  url,
  label,
}: {
  title?: string;
  url: string;
  label?: string;
}) {
  return (
    <AuthLayout>
      <Stack gap="lg">
        <AuthHeader title={title} />
        <Button
          className="mt-4 h-(--control-height) w-full bg-ghostaccent text-primary-foreground hover:bg-ghostaccent/90"
          size="lg"
          asChild
        >
          <a href={url}>{label ?? 'Sign in with SSO →'}</a>
        </Button>
      </Stack>
    </AuthLayout>
  );
}
