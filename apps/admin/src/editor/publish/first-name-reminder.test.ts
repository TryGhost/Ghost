import { describe, expect, it } from 'vitest';
import { countFirstNameOutsideEmailCards } from '@/editor/publish/first-name-reminder';

function lexical(children: unknown[]): string {
  return JSON.stringify({
    root: { children, direction: null, format: '', indent: 0, type: 'root', version: 1 },
  });
}

describe('countFirstNameOutsideEmailCards', () => {
  it('counts helpers outside Email cards, with and without a fallback', () => {
    const body = lexical([
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Hello {first_name}, {first_name, "there"} and {first_name "friend"}',
            type: 'extended-text',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ]);

    expect(countFirstNameOutsideEmailCards(body)).toBe(3);
  });

  it('does not count helpers inside Email cards', () => {
    const body = lexical([
      {
        type: 'email',
        version: 1,
        html: '<p>Hello {first_name} {first_name, "there"} {first_name "friend"}</p>',
      },
    ]);

    expect(countFirstNameOutsideEmailCards(body)).toBe(0);
  });

  it('counts nothing in a malformed or missing body', () => {
    expect(countFirstNameOutsideEmailCards('{invalid json')).toBe(0);
    expect(countFirstNameOutsideEmailCards(null)).toBe(0);
  });
});
