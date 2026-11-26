import errors from '@tryghost/errors';
import type { SegmentRejection } from './tracking';

// The errors the segments service rejects a change to a segment with. Each is a ValidationError,
// which the API answers with a 422 that names the field at fault and gives the error's code, and
// records why the change was rejected on the command's span. A caller that goes on after a
// rejection, as the import does, tells them apart by their class.

/**
 * A change to a segment that the service rejected. It wrote nothing, so a caller's transaction
 * can go on after it.
 */
export abstract class SegmentError extends errors.ValidationError {
  /** Why the change was rejected, as the command's span records it. */
  abstract readonly reason: SegmentRejection;
  /**
   * Which rule rejected the change, as the API's error gives it, so that a client can tell the
   * rules apart without reading the message. A client relies on it, so it doesn't change.
   */
  abstract readonly code: `SEGMENT_${Uppercase<string>}`;
}

/**
 * Another segment has the name, as the service compares names or as the database's collation
 * does.
 */
export class NameTakenError extends SegmentError {
  readonly reason = 'name_taken';
  readonly code = 'SEGMENT_NAME_TAKEN';

  constructor() {
    super({ message: 'A segment with this name already exists', property: 'name' });
  }
}

/** A filter a segment would be saved with isn't valid NQL: the members filter parser can't read it. */
export class FilterUnparseableError extends SegmentError {
  readonly reason = 'filter_unparseable';
  readonly code = 'SEGMENT_FILTER_UNPARSEABLE';

  constructor() {
    super({ message: "A segment's filter is not valid NQL.", property: 'filter' });
  }
}

/** A new segment's filter names a segment, which a segment's filter can't. */
export class FilterNamesSegmentError extends SegmentError {
  readonly reason = 'filter_names_segment';
  readonly code = 'SEGMENT_FILTER_NAMES_SEGMENT';

  constructor() {
    super({ message: "A segment's filter cannot name another segment.", property: 'filter' });
  }
}

/** A change gives a filter other than the segment's own, and a segment's filter can't change. */
export class FilterChangedError extends SegmentError {
  readonly reason = 'filter_changed';
  readonly code = 'SEGMENT_FILTER_CHANGED';

  constructor() {
    super({ message: "A segment's filter cannot be changed", property: 'filter' });
  }
}

/** A change gives a slug other than the segment's own, and a segment's slug can't change. */
export class SlugChangedError extends SegmentError {
  readonly reason = 'slug_changed';
  readonly code = 'SEGMENT_SLUG_CHANGED';

  constructor() {
    super({ message: "A segment's slug cannot be changed", property: 'slug' });
  }
}

/** A new segment can't have the slug it was given, or no slug could be minted for it. */
export abstract class SlugRejectedError extends SegmentError {
  constructor(message: string) {
    super({ message, property: 'slug' });
  }
}

/** Another segment has the slug a new segment was given. */
export class SlugTakenError extends SlugRejectedError {
  readonly reason = 'slug_taken';
  readonly code = 'SEGMENT_SLUG_TAKEN';

  constructor() {
    super('A segment with this slug already exists');
  }
}

/**
 * A filter can't name a segment by the slug a new segment was given: the filter parser reads that
 * slug, without quotes, as something else.
 */
export class SlugUnusableError extends SlugRejectedError {
  readonly reason = 'slug_unusable';
  readonly code = 'SEGMENT_SLUG_UNUSABLE';

  constructor() {
    super(
      "A filter can't name a segment by this slug, as it reads the slug as something else, such as a number or a date",
    );
  }
}

/**
 * Every slug minted from a new segment's name is taken. That needs as many other segments whose
 * names mint the same slug as there are numbers a slug can be given.
 */
export class NoFreeSlugError extends SlugRejectedError {
  readonly reason = 'no_free_slug';
  readonly code = 'SEGMENT_NO_FREE_SLUG';

  constructor() {
    super('Could not mint a unique slug for this segment.');
  }
}
