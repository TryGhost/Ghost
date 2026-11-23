import { useMemo, useState } from 'react';
import { formShows, shaped } from '@tryghost/metafield-types/shapes';
import MemberCustomFields from './member-custom-fields';
import { compositeValue, type CustomFieldValue, type FieldInput } from '../../utils/custom-fields';
import {
  heldAnswers,
  requirementInputs,
  startingValues,
  type Answers,
  type HeldMetafields,
  type SiteRequirement,
} from '../../utils/tier-requirements';

/** A member being asked for what a tier requires: the inputs, and what they hold. */
export interface AskedRequirements {
  inputs: FieldInput[];
  values: Record<string, CustomFieldValue>;
  change: (input: FieldInput, value: CustomFieldValue) => void;
}

/**
 * Asks a member for what a tier requires of them, starting from what they gave before, read from
 * their own record, so they only correct what has changed. The inputs start from the requirements
 * they're first drawn with, so a page asking about another tier draws them afresh.
 */
export function useAskedRequirements(
  requirements: readonly SiteRequirement[],
  /** The member's custom field values, as their own record holds them. */
  metafields: HeldMetafields | undefined,
): AskedRequirements {
  const inputs = useMemo(() => requirementInputs(requirements), [requirements]);
  const [values, setValues] = useState(() =>
    startingValues(inputs, heldAnswers(requirements, metafields)),
  );

  return {
    inputs,
    values,
    change: (input, value) => setValues((given) => ({ ...given, [input.key]: value })),
  };
}

/**
 * Whether an input holds an answer: an address holds one only once it has a country, as every
 * address a tier requires is one it ships to, and nobody can ship to an address without one.
 */
function holdsAnswer(input: FieldInput, value: CustomFieldValue): boolean {
  if (formShows(shaped(input), value) === undefined) {
    return false;
  }
  const { country } = compositeValue(value) ?? {};
  return input.type !== 'address' || Boolean(country?.trim());
}

/** Whether every input holds an answer, which the plan can't change without. */
export function answeredAll({ inputs, values }: AskedRequirements): boolean {
  return inputs.every((input) => holdsAnswer(input, values[input.key]));
}

/**
 * Every answer the member gives, whole, by port: each requirement asked for is answered in full,
 * and each answer replaces what its field holds, as one given at checkout does, so a part of an
 * address left blank is cleared rather than kept.
 */
export function answersOf({ inputs, values }: AskedRequirements): Answers {
  return Object.fromEntries(
    inputs.flatMap((input) => {
      const shown = formShows(shaped(input), values[input.key]);
      return shown === undefined ? [] : [[input.key, shown]];
    }),
  );
}

interface TierRequirementsProps {
  asked: AskedRequirements;
  /** What the site refused, keyed by the name of the input that holds it. */
  errors: Record<string, string | undefined>;
}

/** The inputs a member answers what a tier requires in. */
export default function TierRequirements({ asked, errors }: TierRequirementsProps) {
  return (
    <MemberCustomFields
      errors={errors}
      fields={asked.inputs}
      values={asked.values}
      onChange={(input, value) => asked.change(input, value)}
    />
  );
}
