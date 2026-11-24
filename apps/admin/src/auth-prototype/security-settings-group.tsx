import { Separator } from '@tryghost/shade/components';
import { hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import TopLevelGroup from '@/settings/components/top-level-group';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { useAuthPrototypeEnabled } from '@/auth-prototype/enabled';
import { securitySearchKeywords } from './security-keywords';
import { SsoSection } from './sso/sso-section';
import { TwoStepPolicySection } from './two-factor/two-step-policy-section';

/**
 * Settings > Security: single sign-on and the site-wide two-step rules, side
 * by side, as GitHub and Slack group them. Only for the owner and
 * Administrators, and only while the prototype is on.
 */
export function SecuritySettingsGroup() {
  const enabled = useAuthPrototypeEnabled();
  const { currentUser } = useGlobalData();

  if (!enabled || !hasAdminAccess(currentUser)) {
    return null;
  }

  return (
    <TopLevelGroup
      description="How staff sign in to Ghost."
      keywords={securitySearchKeywords}
      navid="security"
      testId="auth-prototype-security"
      title="Security"
    >
      <SsoSection />
      <Separator />
      <TwoStepPolicySection />
    </TopLevelGroup>
  );
}
