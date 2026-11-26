import { describe, expect, it } from 'vitest';

import { QUERY_PARAMETER_LIMIT, readQuery, writeQuery } from '../../src/bridge/query.ts';

const read = (search: string) => {
  const result = readQuery(search);
  return 'refused' in result ? result.refused : [...result.parameters];
};

// What Ghost's own parser makes of the queries the bridge writes is in a test in Ghost, which
// holds this to the parser its Express apps are set up with.
describe('reading the query an app wrote', () => {
  it('reads each name once with its value decoded, with or without the leading ?', () => {
    expect(read('?limit=5&filter=tag:news')).toEqual([
      ['limit', '5'],
      ['filter', 'tag:news'],
    ]);
    expect(read('limit=5')).toEqual([['limit', '5']]);
    expect(read('')).toEqual([]);
    expect(read('?')).toEqual([]);
  });

  it('reads a part without = as an empty value, and skips empty parts', () => {
    expect(read('?include')).toEqual([['include', '']]);
    expect(read('?include=')).toEqual([['include', '']]);
    expect(read('?a=1&&b&')).toEqual([
      ['a', '1'],
      ['b', ''],
    ]);
    expect(read(`?${'&'.repeat(500)}`)).toEqual([]);
  });

  it('leaves a value free: anything a filter needs, escaped or not', () => {
    expect(read("?filter=slug:'a%2Cb'%2Btag:[x,y]")).toEqual([['filter', "slug:'a,b'+tag:[x,y]"]]);
    expect(read('?filter=a=b]=c')).toEqual([['filter', 'a=b]=c']]);
    expect(read('?filter=a+b%20c')).toEqual([['filter', 'a b c']]);
    expect(read('?filter=%5B%5D%00%25ff')).toEqual([['filter', '[]\u0000%ff']]);
    expect(read('?filter=%E2%9C%93')).toEqual([['filter', '✓']]);
  });

  it('refuses a name that isn’t plain word characters, as parsers read those differently', () => {
    for (const name of [
      'include[]',
      '[include]',
      'include[0]',
      'include%5B%5D',
      '%69nclude',
      'include%',
      'include.a',
      'include ',
      'include+',
      'in-clude',
      'include;a',
      '',
    ]) {
      expect(read(`?${name}=tags`), name).toBe(
        `Apps can't send a query parameter named ${name}: a name may only have letters, digits and _`,
      );
    }
    expect(read('?Include_2=tags')).toEqual([['Include_2', 'tags']]);
  });

  it('refuses a name every object already has, which a parser may drop', () => {
    for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(read(`?${name}=x`), name).toMatch(/^Apps can't send a query parameter named /);
    }
  });

  it('refuses a name that repeats, which a parser may read as a list', () => {
    expect(read('?include=tags&limit=5&include=authors')).toBe(
      "Apps can't send the include parameter more than once",
    );
    expect(read('?include&include')).toBe("Apps can't send the include parameter more than once");
  });

  it('refuses a value with a malformed escape', () => {
    for (const value of ['%', '%zz', '%ff', 'a%e0%a4', '%2']) {
      expect(read(`?fields=${value}`), value).toBe(
        "Apps can't send a fields parameter with a malformed escape in it",
      );
    }
  });

  it('refuses more parameters than the limit, far short of what Ghost’s parser reads', () => {
    const parts = (count: number) =>
      Array.from({ length: count }, (_, index) => `p${index}`).join('&');
    expect(QUERY_PARAMETER_LIMIT).toBe(100);
    expect(read(`?${parts(100)}`)).toHaveLength(100);
    expect(read(`?${parts(101)}`)).toBe("Apps can't send more than 100 query parameters");
  });
});

describe('writing the query the bridge sends', () => {
  it('writes each parameter as its name and its value escaped whole', () => {
    expect(
      writeQuery(
        new Map([
          ['limit', '5'],
          ['filter', "slug:'a,b'+tag:[x,y]&z=1 #"],
          ['include', ''],
        ]),
      ),
    ).toBe("limit=5&filter=slug%3A'a%2Cb'%2Btag%3A%5Bx%2Cy%5D%26z%3D1%20%23&include=");
    expect(writeQuery(new Map())).toBe('');
  });

  it('writes back what it read', () => {
    for (const search of ['?filter=a%5D%3Db&limit=5', '?filter=%00%25ff', '?a=%E2%9C%93']) {
      const result = readQuery(search);
      expect('parameters' in result && `?${writeQuery(result.parameters)}`, search).toBe(search);
    }
  });
});
