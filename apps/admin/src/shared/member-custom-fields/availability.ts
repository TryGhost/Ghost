import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { type FeatureLimit, usePlanStatus } from '@/shared/gates/use-plan-status';

/**
 * The two separate things that can withhold custom fields. The Labs flag says whether this
 * build of Ghost offers them at all, so with it off nothing mentions them. The host limit
 * says whether this site's plan includes them. On a plan without them the server reads
 * every field as archived, so screens that handle archived fields need nothing more, and
 * screens that would change the field list offer the upgrade instead.
 *
 * A screen asks each question on its own: `LabsFlagGate` and `useFeatureFlag` for the flag,
 * `HostLimitGate` and `usePlanStatus` for the limit, the limit only once the flag is on.
 */
export const CUSTOM_FIELDS_FLAG = 'membersCustomFields';
export const CUSTOM_FIELDS_LIMIT = 'limitCustomFields' satisfies FeatureLimit;

/** What a screen that would change custom fields says instead, on a plan without them. */
export const CUSTOM_FIELDS_PLAN_NOTICE =
  'Custom fields are available on the Publisher plan and above.';

/** Whether a screen may offer to create a field: once released, on a plan known to include them. */
export const useCanCreateCustomFields = (): boolean => {
  const released = useFeatureFlag(CUSTOM_FIELDS_FLAG);
  const plan = usePlanStatus(CUSTOM_FIELDS_LIMIT);
  return released && plan === 'included';
};

/**
 * What a screen that would otherwise offer to add a field says instead: the plan notice once
 * released, on a plan known to withhold them. Nothing while unreleased, which mentions nothing.
 */
export const useCustomFieldsPlanNotice = (): string | undefined => {
  const released = useFeatureFlag(CUSTOM_FIELDS_FLAG);
  const plan = usePlanStatus(CUSTOM_FIELDS_LIMIT);
  return released && plan === 'withheld' ? CUSTOM_FIELDS_PLAN_NOTICE : undefined;
};
