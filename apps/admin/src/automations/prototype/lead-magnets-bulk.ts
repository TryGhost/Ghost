// PROTOTYPE ONLY (NY-1750): which label automations adding labels to many members at once (bulk
// add, import) starts, for the hint, banner and confirmation step. Don't merge this folder.
import { useLeadMagnetLabelAutomations } from './lead-magnets';
import { useHintStyle } from './settings';

// A label, and an automation it starts.
export type LeadMagnetBulkMatch = { slug: string; label: string; automation: string };
type Label = { slug: string; name: string };

// The active automations these labels start, from the prototype's fake store, named.
export const useLeadMagnetBulkMatches = (
  labels: Label[],
  slugs: readonly string[],
): LeadMagnetBulkMatch[] =>
  useLeadMagnetLabelAutomations(slugs).map(({ labelSlug, name }) => ({
    slug: labelSlug,
    label: labels.find((label) => label.slug === labelSlug)?.name ?? labelSlug,
    automation: name,
  }));

// Whether the action should stop at the confirmation step first.
export const useLeadMagnetBulkConfirmNeeded = (matches: LeadMagnetBulkMatch[]) =>
  useHintStyle() === 'dialog' && matches.length > 0;

// --- Import: labels from the file's own labels column ---

// Ghost's label slug for a name, near enough for the fake store's lookups.
const slugify = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// The slugs of the labels in the column mapped to Labels, each once: an existing label by name,
// otherwise the slug the import would create it with.
export const leadMagnetFileLabelSlugs = (
  rows: Record<string, string>[],
  column: string | null,
  labels: Label[],
): string[] => {
  if (!column) {
    return [];
  }
  const names = rows.flatMap((row) => (row[column] ?? '').split(',')).map((name) => name.trim());
  const slugs = names
    .filter(Boolean)
    .map(
      (name) =>
        labels.find((label) => label.name.toLowerCase() === name.toLowerCase())?.slug ??
        slugify(name),
    );
  return [...new Set(slugs)];
};
