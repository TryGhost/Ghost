import type { AttributeValue } from './tracer';

/**
 * Attributes as a span's or a count's document ships them. Numbers go in `numeric_labels` and
 * every other attribute in `labels`, as Elastic's APM stores them, because Elasticsearch can only
 * sum, average and bucket a field it maps as a number.
 */
export interface Labels {
  labels: Record<string, string | boolean | string[] | boolean[]>;
  numeric_labels: Record<string, number | number[]>;
}

export const noLabels = (): Labels => ({ labels: {}, numeric_labels: {} });

/**
 * Whether an attribute's value is a number or a list of numbers. A list's first item is enough to
 * tell, because `AttributeValue` only allows lists of one kind. Empty lists are dropped before
 * this is asked, so a list always has a first item.
 */
const isNumeric = (value: AttributeValue): value is number | number[] =>
  typeof value === 'number' || (Array.isArray(value) && typeof value[0] === 'number');

/** Sets one attribute on `labels`, replacing any value its key had. */
export function setLabel(labels: Labels, key: string, value: AttributeValue): void {
  // Elasticsearch reads a dot in a field name as nesting, and `labels` can't hold nested fields,
  // so dots become underscores, as Elastic's APM does for OpenTelemetry attributes.
  const field = key.replace(/\./g, '_');
  // A key set again can change from a number to a string or back, which moves it between
  // `labels` and `numeric_labels`, so its old value is removed from both first.
  delete labels.labels[field];
  delete labels.numeric_labels[field];
  // An empty list is dropped: Elasticsearch stores nothing for one, and with no items there's no
  // telling whether it belongs in `labels` or `numeric_labels`.
  if (Array.isArray(value) && value.length === 0) {
    return;
  }
  // Copied, as OpenTelemetry copies a list attribute, so that the caller changing its list
  // afterwards can't change what ships.
  const copy = structuredClone(value);
  if (isNumeric(copy)) {
    labels.numeric_labels[field] = copy;
  } else {
    labels.labels[field] = copy;
  }
}
