import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import type { LabelsResponseType } from '@tryghost/admin-x-framework/api/labels';

export type LabelsPage = Pick<LabelsResponseType, 'meta'> & { labels: { name: string }[] };

// Core caps every browse at 100 rows, `limit=all` included.
const LABELS_PAGE_SIZE = '100';
// Koenig's labels dropdown adds a typed name that is not in the list (`allowAdd`),
// so a label past this cap is typed rather than picked.
const MAX_LABELS_PAGES = 10;

/**
 * Every label name, up to the page cap, for the Signup card's labels dropdown.
 * Koenig asks with no query and filters as the writer types, so this walks the pages.
 */
export async function fetchAllLabelNames(
  fetchPage: (url: string) => Promise<LabelsPage>,
): Promise<string[]> {
  const names: string[] = [];
  let page: number | null = 1;

  while (page !== null && page <= MAX_LABELS_PAGES) {
    const response: LabelsPage = await fetchPage(
      apiUrl('/labels/', { limit: LABELS_PAGE_SIZE, fields: 'id,name', page: String(page) }),
    );
    names.push(...response.labels.map((label) => label.name));
    page = response.meta?.pagination.next ?? null;
  }

  return names;
}
