/** Minimal RFC4180-ish CSV read/write, enough for members exports. */

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const header = rows.shift() ?? [];
  return { header, rows: rows.filter((entry) => entry.some((value) => value !== '')) };
}

function escapeCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function writeCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n') + '\n';
}

export class CsvTable {
  header: string[];
  rows: string[][];

  constructor(text: string) {
    const parsed = parseCsv(text);
    this.header = parsed.header;
    this.rows = parsed.rows;
  }

  index(column: string): number {
    const at = this.header.indexOf(column);
    if (at === -1) {
      throw new Error(`CSV has no column "${column}". Columns: ${this.header.join(', ')}`);
    }
    return at;
  }

  has(column: string): boolean {
    return this.header.includes(column);
  }

  rowWhere(column: string, value: string): string[] {
    const at = this.index(column);
    const row = this.rows.find((entry) => entry[at] === value);
    if (!row) {
      throw new Error(`CSV has no row where ${column} = ${value}`);
    }
    return row;
  }

  get(row: string[], column: string): string {
    return row[this.index(column)] ?? '';
  }

  set(row: string[], column: string, value: string): void {
    row[this.index(column)] = value;
  }

  addColumn(column: string, valueFor: (row: string[]) => string): void {
    const values = this.rows.map(valueFor);
    this.header.push(column);
    this.rows.forEach((row, at) => row.push(values[at]));
  }

  toString(): string {
    return writeCsv(this.header, this.rows);
  }
}
