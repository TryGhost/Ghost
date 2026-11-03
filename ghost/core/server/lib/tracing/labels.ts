import type { AttributeValue } from './tracer';

/**
 * Attributes as a span's or a count's document ships them. Elastic's APM keeps numbers apart from
 * the other attributes, so they can be summed, averaged and bucketed.
 */
export interface Labels {
  labels: Record<string, string | boolean | string[] | boolean[]>;
  numeric_labels: Record<string, number | number[]>;
}

export const noLabels = (): Labels => ({ labels: {}, numeric_labels: {} });

/** A list holds one kind of value, so its first says which; an empty list is never asked. */
const isNumeric = (value: AttributeValue): value is number | number[] =>
  typeof value === 'number' || (Array.isArray(value) && typeof value[0] === 'number');

/** Sets one attribute on `labels`, replacing any value its key had. */
export function setLabel(labels: Labels, key: string, value: AttributeValue): void {
  // Elasticsearch reads a dot in a field name as nesting, and labels can't nest. Elastic's APM
  // replaces dots the same way.
  const field = key.replace(/\./g, '_');
  // A key set again can change kind, so its old value is cleared from both.
  delete labels.labels[field];
  delete labels.numeric_labels[field];
  // Elasticsearch stores nothing for an empty list, and its kind can't be told.
  if (Array.isArray(value) && value.length === 0) {
    return;
  }
  // Copied, as OpenTelemetry copies a list, so changing it afterwards can't change what ships.
  const copy = structuredClone(value);
  if (isNumeric(copy)) {
    labels.numeric_labels[field] = copy;
  } else {
    labels.labels[field] = copy;
  }
}
