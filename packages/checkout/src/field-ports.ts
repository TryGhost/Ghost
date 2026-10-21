import type { CollectedPart } from './collected-parts.ts';

/**
 * Ghost's checkout ports: the fixed names a checkout collects values under, whichever page asks
 * for them. A binding points a port at the custom field its values are kept in.
 */
export const CHECKOUT_PORT = {
  shippingAddress: 'checkout.shipping.address',
  shippingName: 'checkout.shipping.name',
  phone: 'checkout.phone',
} as const;

/**
 * What a tier can require its members to give, named as the checkout settings name the part
 * that collects it, with the port each of its answers is collected under, by the role it plays.
 * A client lays a requirement out by its roles and sends each answer by its port, so it never
 * needs a port's name. A requirement is asked for while each of its ports is bound to a custom
 * field, whether or not that field is archived: an answer for an archived field is dropped, so
 * archiving a field never changes what members are asked.
 */
export const REQUIREMENTS = {
  shipping: { recipient: CHECKOUT_PORT.shippingName, address: CHECKOUT_PORT.shippingAddress },
  phone: { number: CHECKOUT_PORT.phone },
} as const satisfies { [Part in CollectedPart]?: Readonly<Record<string, string>> };
export type RequirementName = keyof typeof REQUIREMENTS;

/** The ports a binding can point at a custom field: the ports of the requirements. */
export type CheckoutPort = {
  [Name in RequirementName]: (typeof REQUIREMENTS)[Name][keyof (typeof REQUIREMENTS)[Name]];
}[RequirementName];

/** The ports this requirement's answers are collected under. */
export function portsOf(name: RequirementName): readonly CheckoutPort[] {
  const roles: Readonly<Record<string, CheckoutPort>> = REQUIREMENTS[name];
  return Object.values(roles);
}

/**
 * What each requirement is set to beyond the paid tiers it covers. Shipping can be limited to some
 * countries, which its address must be in, and ships anywhere without them. The phone number has
 * nothing of its own. Every requirement needs an entry, as each one's listed shape is built from
 * its own.
 */
export type RequirementSettings = {
  shipping: { countries?: readonly string[] };
  phone: Record<never, never>;
};

/**
 * A role's port as a tier lists it, with the custom field its answer is saved into, such as
 * `custom.delivery_address`, while members can read what they hold there, so a client asking a
 * member again can fill in what they gave from their own record. Answers are sent by port either
 * way, as a port can save into a field members can't see.
 */
export interface ListedPort {
  port: CheckoutPort;
  field?: string;
}

/** Each of a requirement's roles, with its port as a tier lists it. */
export type ListedPorts<Name extends RequirementName> = {
  readonly [Role in keyof (typeof REQUIREMENTS)[Name]]: ListedPort;
};

/**
 * A requirement as tiers list it: its name, each of its roles' ports, and its own settings, so only
 * shipping lists countries. Each requirement has its own shape, told apart by its name:
 * `ListedRequirement<'shipping'>` is shipping's, and `ListedRequirement` is any of them.
 */
export type ListedRequirement<Name extends RequirementName = RequirementName> = {
  [N in Name]: { name: N; ports: ListedPorts<N> } & RequirementSettings[N];
}[Name];

/** What to do with each requirement, by name, each given the requirement in its own shape. */
export type RequirementHandlers<R> = {
  [Name in RequirementName]: (requirement: ListedRequirement<Name>) => R;
};

/**
 * Does with a requirement what the handler for its name does. A requirement added above fails to
 * compile here until it's handled, and then wherever this is called until it has a handler.
 */
export function matchRequirement<R>(
  requirement: ListedRequirement,
  handlers: RequirementHandlers<R>,
): R {
  switch (requirement.name) {
    case 'shipping':
      return handlers.shipping(requirement);
    case 'phone':
      return handlers.phone(requirement);
  }
}

export function isRequirementName(name: string): name is RequirementName {
  return Object.hasOwn(REQUIREMENTS, name);
}

export const CHECKOUT_PORTS: readonly CheckoutPort[] = Object.keys(REQUIREMENTS)
  .filter(isRequirementName)
  .flatMap(portsOf);

export function isCheckoutPort(key: string): key is CheckoutPort {
  return CHECKOUT_PORTS.some((port) => port === key);
}
