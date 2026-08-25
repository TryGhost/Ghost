import Papa from 'papaparse';

export function parseCSV(text: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, unknown>>(text.replace(/^\ufeff/, ''), {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data
    .map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key === '__parsed_extra') {
          continue;
        }
        normalized[key] = typeof value === 'string' ? value : '';
      }
      return normalized;
    })
    .filter((row) => Object.keys(row).length > 0);
}

export function columnsOf(rows: Record<string, string>[]): string[] {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      columns.add(column);
    }
  }
  return [...columns];
}

export function readCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') {
          throw new Error('Failed to read CSV file as text');
        }
        resolve(parseCSV(reader.result));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse CSV file'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read CSV file'));
    reader.onabort = () => reject(new Error('Reading the CSV file was interrupted'));
    reader.readAsText(file);
  });
}
