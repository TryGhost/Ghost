import errors from '@tryghost/errors';

// The rule by which a segment's name is taken, and the error that rejects a change for it. A
// caller that goes on after a rejection, as the import does, recognises it here rather than by
// reading the error's fields.

/** A name as names are compared: ignoring case and surrounding whitespace. */
export const normalizeName = (name: string) => name.trim().toLowerCase();

const NAME_TAKEN = 'A view with this name already exists';

/** The error that rejects a change because another segment has the name. */
export const nameTakenError = () =>
  new errors.ValidationError({ message: NAME_TAKEN, property: 'name' });

export const isNameTakenError = (err: unknown) =>
  err instanceof errors.ValidationError && err.message === NAME_TAKEN;
