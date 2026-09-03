import { useFeatureFlag, useHostLimits } from '@tryghost/admin-x-framework/hooks';

/**
 * Whether this site may use custom member fields.
 *
 * Two separate things can withhold them, and one place answers for both, so a screen
 * cannot be left checking one and forgetting the other. The labs flag says whether this
 * build of Ghost offers the feature at all; the host limit says whether this site's plan
 * includes it. When the flag goes at GA only this function changes.
 *
 * The limit is unset on every self-hosted site and on any plan that includes the feature,
 * which is every site today.
 *
 * A boolean because that is all any screen needs so far. The server does distinguish the
 * two refusals, answering "not found" for the flag and "forbidden" for the limit, so a
 * screen that offers an upgrade will want to know which applies. Nothing offers one yet,
 * so the reason is not reported until something reads it.
 */
export const useCustomFieldsAvailable = (): boolean => {
  const hasFlag = useFeatureFlag('membersCustomFields');
  const limit = useHostLimits()?.limitCustomFields;

  return hasFlag && limit?.disabled !== true;
};
