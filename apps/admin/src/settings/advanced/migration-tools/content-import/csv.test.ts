import { columnsOf, parseCSV } from './csv';

describe('content import CSV', () => {
  it('parses CSV values and preserves columns missing from the first row', () => {
    const rows = parseCSV('Title,Body,Date\nFirst,,\nSecond,<p>Body</p>,2025-01-01\n');

    expect(rows).toEqual([
      { Title: 'First', Body: '', Date: '' },
      { Title: 'Second', Body: '<p>Body</p>', Date: '2025-01-01' },
    ]);
    expect(columnsOf(rows)).toEqual(['Title', 'Body', 'Date']);
  });

  it('drops Papa Parse overflow cells from the mapping columns', () => {
    const rows = parseCSV('Title\nFirst,overflow\n');

    expect(rows).toEqual([{ Title: 'First' }]);
    expect(columnsOf(rows)).toEqual(['Title']);
  });
});
