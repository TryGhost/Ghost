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

export function isRequirementName(name: string): name is RequirementName {
  return Object.hasOwn(REQUIREMENTS, name);
}

export const CHECKOUT_PORTS: readonly CheckoutPort[] = Object.keys(REQUIREMENTS)
  .filter(isRequirementName)
  .flatMap(portsOf);

export function isCheckoutPort(key: string): key is CheckoutPort {
  return CHECKOUT_PORTS.some((port) => port === key);
}
