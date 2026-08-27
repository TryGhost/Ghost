import { z } from 'zod';

// Config arrives untyped: defaults.json ships a value, and any higher layer -- an
// operator's config file, an environment variable, argv -- can replace it with anything.
// Validating it into a usable number is a config concern, so it happens here at the
// boundary; the importer is handed a resolved value.

// The row count at or below which an import is performed while the request is
// still open. Zero is allowed and means every import is deferred. A numeric
// string is accepted because a value supplied through an environment variable
// can arrive as one.
const Threshold = z
  .union([z.number(), z.string().trim().min(1)])
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));

// defaults.json is the single source of the shipped threshold: it is the lowest
// config layer and the file an operator actually reads and edits, so it is read
// rather than restated. Parsed eagerly because a missing or malformed value
// there is our bug rather than an operator's, and should fail loudly at boot
// instead of quietly becoming the fallback for everything below.
const shippedThreshold: number = Threshold.parse(
  require('../../../../shared/config/defaults.json').members.importer.inlineThreshold,
);

// A higher layer can override the shipped value with anything. Something
// unreadable falls back to the shipped threshold rather than throwing, because
// an operator can correct this live and a bad value must not take member import
// down with it.
const InlineThreshold = Threshold.catch(shippedThreshold);

export function resolveInlineThreshold(configured: unknown): number {
  return InlineThreshold.parse(configured);
}
