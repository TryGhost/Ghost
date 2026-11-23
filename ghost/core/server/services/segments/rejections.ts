import errors from '@tryghost/errors';

// The rules by which a segment's name or filter is taken, and the errors that reject a change
// for them. A caller that goes on after a rejection, as the import does, recognises it here
// rather than by reading the error's fields.

/** A name as names are compared: ignoring case and surrounding whitespace. */
export const normalizeName = (name: string) => name.trim().toLowerCase();

const NAME_TAKEN = 'A view with this name already exists';
const FILTER_TAKEN = 'A view with this filter already exists';

/** The error that rejects a change because another segment has the name. */
export const nameTakenError = () =>
  new errors.ValidationError({ message: NAME_TAKEN, property: 'name' });

/** The error that rejects a new segment because another segment has its filter. */
export const filterTakenError = () =>
  new errors.ValidationError({ message: FILTER_TAKEN, property: 'filter' });

export const isNameTakenError = (err: unknown) =>
  err instanceof errors.ValidationError && err.message === NAME_TAKEN;

export const isFilterTakenError = (err: unknown) =>
  err instanceof errors.ValidationError && err.message === FILTER_TAKEN;
