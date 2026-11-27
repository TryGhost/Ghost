import type { Allowed } from '../authorize';
import type { Principal } from '../../principal';

export interface RowRuleInput {
  principal: Principal;
  action: string;
  /** Whether the principal's grants hold the key; the rule may narrow or widen it */
  granted: boolean;
  resource?: unknown;
  attrs: Record<string, unknown>;
}

/** Decides one object type's requests; resolves when allowed and throws otherwise. */
export type RowRule = (input: RowRuleInput) => Promise<Allowed>;

/**
 * Row rules by object type. Empty until the model `permissible` hooks move
 * here, one model at a time.
 */
export const rowRules: Readonly<Record<string, RowRule>> = Object.freeze({});
