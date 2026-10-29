import errors from '@tryghost/errors';
import type { ReadonlyDeep } from 'type-fest';
import type { AutomationTriggerRuleDefinition } from '../trigger-rules';

type TriggerType = AutomationTriggerRuleDefinition['trigger_type'];

const isEveryScopeTheSame = (rules: ReadonlyDeep<AutomationTriggerRuleDefinition[]>): boolean =>
  new Set(rules.map((rule) => rule.scope)).size === 1;

const hasUniqueProducts = (rules: ReadonlyDeep<AutomationTriggerRuleDefinition[]>): boolean =>
  new Set(rules.map((rule) => rule.product_id)).size === rules.length;

const typeSpecificValidators: Record<
  TriggerType,
  (
    firstRule: ReadonlyDeep<AutomationTriggerRuleDefinition>,
    rules: ReadonlyDeep<AutomationTriggerRuleDefinition[]>,
  ) => boolean
> = {
  free_signup: (_firstRule, rules) => rules.length === 1,

  paid_subscription_started: ({ scope }, rules) => {
    switch (scope) {
      case null:
      case 'free':
        return false;
      case 'any_paid_tier':
        return rules.length === 1;
      case 'specific_paid_tier':
        return isEveryScopeTheSame(rules) && hasUniqueProducts(rules);
      default: {
        const _exhaustive: never = scope;
        throw new errors.InternalServerError({
          message: `Unexpected automation trigger rule scope: ${_exhaustive}`,
        });
      }
    }
  },

  paid_subscription_changed: (_firstRule, rules) => {
    const froms: AutomationTriggerRuleDefinition[] = [];
    const tos: AutomationTriggerRuleDefinition[] = [];
    for (const rule of rules) {
      switch (rule.direction) {
        case 'from':
          froms.push(rule);
          break;
        case 'to':
          tos.push(rule);
          break;
        case null:
          return false;
        default: {
          const _exhaustive: never = rule;
          throw new errors.InternalServerError({
            message: `Unexpected automation rule: ${_exhaustive}`,
          });
        }
      }
    }

    if (!isEveryScopeTheSame(froms) || !isEveryScopeTheSame(tos)) {
      return false;
    }

    const [firstFrom] = froms;
    const [firstTo] = tos;
    if (!firstFrom || !firstTo) {
      return false;
    }

    const rulesWithProducts = [];

    switch (firstFrom.scope) {
      case null:
      case 'free':
        return false;
      case 'any_paid_tier':
        if (froms.length !== 1) {
          return false;
        }
        break;
      case 'specific_paid_tier':
        rulesWithProducts.push(...froms);
        break;
      default: {
        const _exhaustive: never = firstFrom;
        throw new errors.InternalServerError({
          message: `Unexpected automation rule scope: ${_exhaustive}`,
        });
      }
    }

    switch (firstTo.scope) {
      case null:
      case 'any_paid_tier':
        return false;
      case 'free':
        if (tos.length !== 1) {
          return false;
        }
        break;
      case 'specific_paid_tier':
        rulesWithProducts.push(...tos);
        break;
      default: {
        const _exhaustive: never = firstTo;
        throw new errors.InternalServerError({
          message: `Unexpected automation rule scope: ${_exhaustive}`,
        });
      }
    }

    if (!hasUniqueProducts(rulesWithProducts)) {
      return false;
    }

    return true;
  },
};

export const areTriggerRulesValid = (
  rules: readonly AutomationTriggerRuleDefinition[],
): boolean => {
  const [firstRule] = rules;
  if (!firstRule) {
    return false;
  }

  const isEveryTriggerTypeTheSame = rules.every(
    (rule) => rule.trigger_type === firstRule.trigger_type,
  );
  if (!isEveryTriggerTypeTheSame) {
    return false;
  }

  if (!Object.hasOwn(typeSpecificValidators, firstRule.trigger_type)) {
    throw new errors.InternalServerError({
      message: `Unexpected automation trigger rule type: ${firstRule.trigger_type}`,
    });
  }

  const typeSpecificValidator = typeSpecificValidators[firstRule.trigger_type];
  return typeSpecificValidator(firstRule, rules);
};
