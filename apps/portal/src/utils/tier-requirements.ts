import type { PORT_FIELD, REQUIREMENTS } from '@tryghost/checkout';
import { STRIPE_ALLOWED_COUNTRIES } from '@tryghost/checkout/allowed-countries';
import { t } from './i18n';
import type { FieldInput } from './custom-fields';

/**
 * What a tier's members must give, as the tiers API lists it: a requirement by name, such as
 * `shipping`, the port each of its answers is collected under, by the role it plays, such as
 * `recipient`, and for an address, the countries it must be in when fewer than all. A name or
 * role this build doesn't know is skipped.
 */
export interface ListedRequirement {
  name: string;
  ports: Record<string, string>;
  countries?: string[];
}

/** A member's answers, each by the port it's collected under, as the members API reads and saves them. */
export type Answers = Record<string, unknown>;

type Requirements = typeof REQUIREMENTS;

/** The kinds of answer any port takes. */
type PortFieldType = (typeof PORT_FIELD)[keyof typeof PORT_FIELD]['type'];

/** The kind of answer a role's port takes, as the port's custom field must hold it. */
type PortType<
  Name extends keyof Requirements,
  Role extends keyof Requirements[Name],
> = Requirements[Name][Role] extends keyof typeof PORT_FIELD
  ? (typeof PORT_FIELD)[Requirements[Name][Role]]['type']
  : never;

/**
 * How Portal asks for each requirement it knows: an input for each of its roles, with its label
 * and the kind of answer it takes, in the order they're asked, with the requirements asked in
 * the order they're listed here. Typed against the shared requirements and ports, so a role added
 * or renamed there, or a port taking a different kind of answer, fails to build here until its
 * input follows.
 */
const LAYOUTS: {
  [Name in keyof Requirements]: {
    [Role in keyof Requirements[Name]]: { label: () => string; type: PortType<Name, Role> };
  };
} = {
  shipping: {
    recipient: { label: () => t('Recipient name'), type: 'short_text' },
    address: { label: () => t('Shipping address'), type: 'address' },
  },
  phone: {
    number: { label: () => t('Phone number'), type: 'short_text' },
  },
};

/**
 * The inputs these requirements are asked in, in Portal's order rather than the order they're
 * listed in, each keyed by the port its answer is saved through, so a member's answers fill and
 * save them by port. Every input takes an answer the member may give, whatever the access of the
 * field it lands in, as the port's binding admits it.
 */
export function requirementInputs(requirements: ListedRequirement[]): FieldInput[] {
  const listed = new Map(requirements.map((requirement) => [requirement.name, requirement]));
  return Object.entries(LAYOUTS).flatMap(([name, layout]) => {
    const requirement = listed.get(name);
    if (!requirement) {
      return [];
    }
    const roles: Record<string, { label: () => string; type: PortFieldType }> = layout;
    return Object.entries(roles).flatMap(([role, { label, type }]) => {
      const port = requirement.ports[role];
      return port
        ? [
            {
              key: port,
              name: label(),
              readOnly: false,
              type,
              settings: undefined,
              // Only where Stripe ships, and where the tier limits it to, so a member can't pick
              // somewhere a checkout for the tier would refuse.
              countries:
                type === 'address'
                  ? (requirement.countries ?? STRIPE_ALLOWED_COUNTRIES)
                  : undefined,
            },
          ]
        : [];
    });
  });
}

/**
 * Which of these inputs a refused answer is about, and which part of it, or `''` for its whole
 * value, from the request property the members API names it by, `answers.<port>[.<part>]`; or
 * null when none of them is. A port's name has dots of its own, so the property is matched against
 * each input's port, the longest first, so a port whose name begins another's can't take its
 * refusals.
 */
export function refusedAnswer(
  inputs: FieldInput[],
  property: string,
): { field: FieldInput; part: string } | null {
  const longestFirst = [...inputs].sort((a, b) => b.key.length - a.key.length);
  for (const field of longestFirst) {
    const named = `answers.${field.key}`;
    if (property === named) {
      return { field, part: '' };
    }
    if (property.startsWith(`${named}.`)) {
      return { field, part: property.slice(named.length + 1) };
    }
  }
  return null;
}
