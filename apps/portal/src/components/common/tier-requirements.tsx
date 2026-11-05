import { useEffect, useMemo, useState } from 'react';
import { formShows, shaped } from '@tryghost/metafield-types/shapes';
import MemberCustomFields from './member-custom-fields';
import {
  compositeValue,
  customFieldTexts,
  type CustomFieldValue,
  type FieldInput,
} from '../../utils/custom-fields';
import {
  requirementInputs,
  type Answers,
  type ListedRequirement,
} from '../../utils/tier-requirements';

/** A member being asked for what a tier requires: what the inputs hold, and what they gave before. */
export interface AskedRequirements {
  inputs: FieldInput[];
  /** What the member gave before, by port, or null until it arrives. */
  held: Answers | null;
  values: Record<string, CustomFieldValue>;
  change: (input: FieldInput, value: CustomFieldValue) => void;
}

/**
 * Asks a member for what a tier requires of them, starting from what they gave before, so they
 * only correct what has changed. Their answers are loaded only when the tier requires something.
 */
export function useAskedRequirements(
  requirements: ListedRequirement[],
  /** The member's answers as they stand, by port, which the inputs start from. */
  loadAnswers: () => Promise<Answers>,
): AskedRequirements {
  const inputs = useMemo(() => requirementInputs(requirements), [requirements]);
  const [held, setHeld] = useState<Answers | null>(null);
  const [values, setValues] = useState<Record<string, CustomFieldValue>>({});

  useEffect(() => {
    if (inputs.length === 0) {
      return undefined;
    }
    let current = true;
    // A site that can't say what the member gave before asks them afresh.
    loadAnswers()
      .catch(() => ({}))
      .then((answers) => {
        if (current) {
          setHeld(answers);
          setValues(customFieldTexts(inputs, answers));
        }
      });
    return () => {
      current = false;
    };
  }, [inputs, loadAnswers]);

  return {
    inputs,
    held,
    values,
    change: (input, value) => setValues((given) => ({ ...given, [input.key]: value })),
  };
}

/**
 * Whether an input holds an answer: an address limited to some countries holds one only once it
 * has a country, as nobody can ship to an address without one.
 */
function holdsAnswer(input: FieldInput, value: CustomFieldValue): boolean {
  if (formShows(shaped(input), value) === undefined) {
    return false;
  }
  const { country } = compositeValue(value) ?? {};
  return !input.countries || Boolean(country?.trim());
}

/** Whether every input holds an answer, which the plan can't change without. */
export function answeredAll({ inputs, held, values }: AskedRequirements): boolean {
  return (
    inputs.length === 0 ||
    (held !== null && inputs.every((input) => holdsAnswer(input, values[input.key])))
  );
}

/**
 * Every answer the member gives, whole, by port: given at all, the answers must cover everything
 * the tier requires, and each replaces what its field holds, as one given at checkout does, so a
 * part of an address left blank is cleared rather than kept.
 */
export function answersOf({ inputs, held, values }: AskedRequirements): Answers {
  if (!held) {
    return {};
  }
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

/**
 * The inputs a member answers what a tier requires in. Nothing is drawn until what they gave
 * before arrives, so nothing they type can be replaced by it.
 */
export default function TierRequirements({ asked, errors }: TierRequirementsProps) {
  if (!asked.held) {
    return null;
  }
  return (
    <MemberCustomFields
      errors={errors}
      fields={asked.inputs}
      values={asked.values}
      onChange={(input, value) => asked.change(input, value)}
    />
  );
}
