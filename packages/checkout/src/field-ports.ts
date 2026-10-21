/**
 * Ghost's checkout ports: the fixed names a checkout collects values under, whichever page asks
 * for them, Stripe Checkout or Portal when a paying member changes tier. A binding points a port
 * at the custom field its values are kept in. A port can be given in parts, named after it the
 * way a field's parts are: shipping is given as its address and its recipient's name.
 */
export const CHECKOUT_PORT = {
  shipping: 'checkout.shipping',
  shippingAddress: 'checkout.shipping.address',
  shippingName: 'checkout.shipping.name',
  phone: 'checkout.phone',
} as const;

/** A part a port is given in, and whether the port can be asked for without somewhere to keep it. */
interface PortPart {
  port: string;
  essential: boolean;
}

/**
 * The ports a tier can require its members to give, and the parts each is given in. A port
 * given whole is its own one part. While an essential part has nowhere to be kept, the port
 * isn't asked for: shipping can't be asked without its address, but without the recipient's
 * name the address is still kept.
 */
export const PORT_PARTS = {
  [CHECKOUT_PORT.shipping]: [
    { port: CHECKOUT_PORT.shippingAddress, essential: true },
    { port: CHECKOUT_PORT.shippingName, essential: false },
  ],
  [CHECKOUT_PORT.phone]: [{ port: CHECKOUT_PORT.phone, essential: true }],
} as const satisfies Record<string, readonly [PortPart, ...PortPart[]]>;
export type RequiredPort = keyof typeof PORT_PARTS;

/** The ports a binding can point at a custom field: the parts of the ports a tier can require. */
export type CheckoutPort = (typeof PORT_PARTS)[RequiredPort][number]['port'];
export const CHECKOUT_PORTS: readonly CheckoutPort[] = Object.values(PORT_PARTS).flatMap((parts) =>
  parts.map(({ port }) => port),
);

export function isCheckoutPort(key: string): key is CheckoutPort {
  return CHECKOUT_PORTS.some((port) => port === key);
}

export function isRequiredPort(port: string): port is RequiredPort {
  return Object.hasOwn(PORT_PARTS, port);
}

/**
 * Whether a port can be asked for, from the field each of its parts is kept in: while every part
 * has one, as a part kept nowhere leaves the setting incomplete, and every essential part's can
 * take a value, as its answer would otherwise have nowhere to go.
 */
export function isAskable(
  port: RequiredPort,
  keptIn: (part: CheckoutPort) => { ready: boolean } | undefined,
): boolean {
  const parts: ReadonlyArray<{ port: CheckoutPort; essential: boolean }> = PORT_PARTS[port];
  return parts.every(({ port: part, essential }) => {
    const field = keptIn(part);
    return field !== undefined && (field.ready || !essential);
  });
}
