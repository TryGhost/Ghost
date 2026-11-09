// The card runtime's constants, as `@tryghost/app-contracts/cards` defines them. Repeated here
// so the card bundles import the contracts for types only: that entry point also holds Admin's
// schemas, and a card bundle must not carry zod.

/** The global a card bundle sets to the function that starts it on a port. */
export const CARD_START_GLOBAL = '__ghostCardStart';

export const CARD_HEIGHT_MIN = 20;
export const CARD_HEIGHT_MAX = 4000;
