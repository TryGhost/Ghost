import type { Key } from '@tryghost/metafield-types/identity';
import type { Slug } from '../../../lib/slug';

/**
 * A key that addresses a field: either a `Key`, as `KeySchema` reads one from storage, or an
 * underscore slug, as a key is written when a field is created, minted from the name a publisher
 * chose or given by a caller.
 *
 * A key is written as a slug with an underscore between its words (see `mintSlug`): member
 * filters, CSV columns, email replacement strings and themes, where a key is typed by hand, agree
 * on the underscore. `KeySchema` is looser than a slug and also accepts keys such as `a__b`, which
 * a field created before keys had to be slugs can have. Every underscore slug is a key the fields
 * table can store, so a key is written as the slug it is, and whatever addresses the field by it
 * takes either kind.
 */
export type FieldKey = Key | Slug<'_'>;
