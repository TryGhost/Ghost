import Papa from 'papaparse';

export function parseCSV(text: string): Record<string, string>[] {
    const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
    }) as {data: Array<Record<string, unknown>>};

    if (!parsed.data || parsed.data.length < 1) {
        return [];
    }

    return parsed.data.map((row: Record<string, unknown>) => {
        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
            normalized[key] = typeof value === 'string' ? value : (value === null || value === undefined ? '' : String(value));
        }
        return normalized;
    });
}

export function unparseErrorCSV(rows: Array<Record<string, string> & {error: string}>): string {
    if (rows.length === 0) {
        return '';
    }

    return Papa.unparse(rows, {
        quotes: true
    });
}
