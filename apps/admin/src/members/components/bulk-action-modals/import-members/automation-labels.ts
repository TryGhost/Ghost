function labelColumns(mapping: Record<string, string | null>): string[] {
  return Object.keys(mapping).filter((column) => mapping[column] === 'labels');
}

function labelsInRow(row: Record<string, string>, columns: string[]): string[] {
  return columns
    .flatMap((column) => (row[column] ?? '').split(','))
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Reads only columns included in the effective upload mapping, using the importer's comma separator. */
export function csvAutomationLabelNames({
  fileData,
  mapping,
}: {
  fileData: Record<string, string>[];
  mapping: Record<string, string | null>;
}): string[] {
  const columns = labelColumns(mapping);
  const names = new Map<string, string>();
  for (const row of fileData) {
    for (const name of labelsInRow(row, columns)) {
      names.set(name.toLowerCase(), name);
    }
  }
  return [...names.values()];
}

/** Counts potentially affected rows, once each, rather than exact enrollments. */
export function countImportAutomationRows({
  fileData,
  mapping,
  selectedLabelIds,
  matchingLabels,
}: {
  fileData: Record<string, string>[];
  mapping: Record<string, string | null>;
  selectedLabelIds: string[];
  matchingLabels: { id: string; name: string }[];
}): number {
  const matchingIds = new Set(matchingLabels.map(({ id }) => id));
  if (selectedLabelIds.some((id) => matchingIds.has(id))) {
    return fileData.length;
  }

  const names = new Set(matchingLabels.map(({ name }) => name.trim().toLowerCase()));
  if (names.size === 0) {
    return 0;
  }
  const columns = labelColumns(mapping);
  let count = 0;
  for (const row of fileData) {
    if (labelsInRow(row, columns).some((name) => names.has(name.toLowerCase()))) {
      count += 1;
    }
  }
  return count;
}
