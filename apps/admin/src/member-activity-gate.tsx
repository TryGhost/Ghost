import { lazy } from 'react';
import { FlagGatedRoute } from './flag-gated-route';
import { lazyMemberActivityScreen } from './members/api';

const MemberActivityReact = lazy(lazyMemberActivityScreen);

export function MemberActivityGate() {
  return <FlagGatedRoute component={MemberActivityReact} flag="membersActivityReact" />;
}
