import type { ListedRequirement, PORT_FIELD, RequirementName } from '@tryghost/checkout';
// From the requirements alone, as the package's root also holds what's built out of zod, which
// Portal's bundle leaves out.
import { REQUIREMENTS, isRequirementName, matchRequirement } from '@tryghost/checkout/field-ports';
import { t } from './i18n';
import {
  compositeValue,
  customFieldTexts,
  type CustomFieldValue,
  type FieldInput,
} from './custom-fields';

/**
 * A requirement as a tier lists it, from a site that may be newer than this build, so it may be
 * one this build doesn't know.
 */
export interface SiteRequirement {
  name: string;
  ports: Readonly<Record<string, unknown>>;
}

/** A member's answers, each by the port it's collected under, as a change of tier saves them. */
export type Answers = Record<string, unknown>;

/** A member's custom field values by namespace and key, as their own record holds them. */
export type HeldMetafields = Readonly<
  Record<string, Readonly<Record<string, unknown>> | undefined>
>;

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

/** How one of a requirement's roles is asked: its label, and the kind of answer it takes. */
interface Asked<Type extends PortFieldType = PortFieldType> {
  label: string;
  type: Type;
  /** For an address, the countries it must be in, when fewer than every country. */
  countries?: readonly string[] | undefined;
}

/**
 * How Portal asks for each requirement it knows, from the requirement as the tier lists it: an
 * input for each of its roles, in the order they're asked, with the requirements asked in the
 * order they're listed here. Typed against the shared requirements and ports, so a requirement
 * added there, a role added or renamed, or a port taking a different kind of answer, fails to
 * build here until its inputs follow.
 */
const LAYOUTS: {
  [Name in RequirementName]: (requirement: ListedRequirement<Name>) => {
    [Role in keyof Requirements[Name]]: Asked<PortType<Name, Role>>;
  };
} = {
  shipping: ({ countries }) => ({
    recipient: { label: t('Recipient name'), type: 'short_text' },
    // Only where the tier ships, when it's limited to some countries, so a member can't pick
    // somewhere it would refuse.
    address: { label: t('Shipping address'), type: 'address', countries },
  }),
  phone: () => ({
    number: { label: t('Phone number'), type: 'phone' },
  }),
};

/**
 * Whether this build knows a requirement a tier lists: its name, and exactly the roles this build
 * asks for, so one a newer site has given another role is left out whole rather than answered in
 * part, which the site would refuse. The rest is read in that requirement's own shape, as the site
 * lists it.
 */
function isKnown(requirement: SiteRequirement): requirement is ListedRequirement {
  if (!isRequirementName(requirement.name)) {
    return false;
  }
  const roles = Object.keys(REQUIREMENTS[requirement.name]);
  const listed = Object.keys(requirement.ports);
  return listed.length === roles.length && roles.every((role) => listed.includes(role));
}

/**
 * The inputs the requirements this build knows are asked in, in Portal's order rather than the
 * order they're listed in, each keyed by the port its answer is saved through, so a member's
 * answers fill and save them by port. One this build doesn't know is left out, and as each
 * requirement is answered whole or not at all, the member changes tier with the rest answered.
 * Every input takes an answer the member may give, whatever the access of the field it lands in,
 * as the port's binding admits it.
 */
export function requirementInputs(listed: readonly SiteRequirement[]): FieldInput[] {
  const known = listed.filter(isKnown);
  return Object.keys(LAYOUTS).flatMap((name) => {
    const requirement = known.find((candidate) => candidate.name === name);
    if (!requirement) {
      return [];
    }
    const roles = matchRequirement<Readonly<Record<string, Asked>>>(requirement, LAYOUTS);
    const ports: Readonly<Record<string, { port: string } | undefined>> = requirement.ports;
    return Object.entries(roles).flatMap(([role, { label, type, countries }]) => {
      const port = ports[role]?.port;
      return port
        ? [{ key: port, name: label, readOnly: false, type, settings: undefined, countries }]
        : [];
    });
  });
}

/**
 * What each input starts from: what the member holds, by port, except an address held in a
 * country its input doesn't offer, which starts without it, so the member picks one the tier ships
 * to rather than confirming one it refuses.
 */
export function startingValues(
  inputs: FieldInput[],
  held: Answers,
): Record<string, CustomFieldValue> {
  const texts = customFieldTexts(inputs, held);
  return Object.fromEntries(
    inputs.map((input) => {
      const text = texts[input.key];
      const address = compositeValue(text);
      const { country } = address ?? {};
      return [
        input.key,
        address && country && input.countries && !input.countries.includes(country)
          ? { ...address, country: '' }
          : text,
      ];
    }),
  );
}

/**
 * What the member holds for each port the requirements this build knows ask through, by port, read
 * from their own record through the field the port names, so a member asked again starts from
 * what they gave. A port that names no field, as members may not read it, holds nothing here.
 */
export function heldAnswers(
  listed: readonly SiteRequirement[],
  metafields: HeldMetafields | undefined,
): Answers {
  return Object.fromEntries(
    listed.filter(isKnown).flatMap(({ ports }) => {
      const roles: Readonly<Record<string, { port: string; field?: string }>> = ports;
      return Object.values(roles).flatMap(({ port, field }) => {
        // A field's identity is its namespace and key joined by a dot, which neither can hold, so
        // it splits back by position. Split here rather than with the identity schema in
        // `@tryghost/metafield-types`, which is built out of zod, which Portal's bundle leaves out.
        const [namespace = '', key = ''] = field?.split('.') ?? [];
        const held = metafields?.[namespace]?.[key];
        return held === undefined ? [] : [[port, held]];
      });
    }),
  );
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
