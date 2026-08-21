import { columnAddressing, composeCodec } from './filter-addressing';
import {
  dateSemantics,
  numberSemantics,
  scalarSemantics,
  setSemantics,
  textSemantics,
} from './semantics';
import type { ValueConfig } from './semantics';
import { parseFilterToAst } from './filter-query-core';
type CodecConfig = ValueConfig & { field?: string };
const textCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), textSemantics());
const scalarCodec = (config?: CodecConfig) =>
  composeCodec(columnAddressing(config), scalarSemantics(config));
const setCodec = (config?: CodecConfig) =>
  composeCodec(columnAddressing(config), setSemantics(config));
const numberCodec = (config?: CodecConfig) =>
  composeCodec(columnAddressing(config), numberSemantics());
const dateCodec = (config?: CodecConfig) => composeCodec(columnAddressing(config), dateSemantics());

import { describe, expect, it } from 'vitest';
import type { CodecContext, FilterPredicate } from './filter-types';

function ast(filter: string) {
  const node = parseFilterToAst(filter);

  if (!node) {
    throw new Error(`could not parse: ${filter}`);
  }

  return node;
}

const statusContext: CodecContext = {
  key: 'status',
  pattern: 'status',
  params: {},
  timezone: 'UTC',
};

const emailContext: CodecContext = {
  key: 'email',
  pattern: 'email',
  params: {},
  timezone: 'UTC',
};

const authorContext: CodecContext = {
  key: 'author',
  pattern: 'author',
  params: {},
  timezone: 'UTC',
};

const bodyContext: CodecContext = {
  key: 'body',
  pattern: 'body',
  params: {},
  timezone: 'UTC',
};

const labelContext: CodecContext = {
  key: 'label',
  pattern: 'label',
  params: {},
  timezone: 'UTC',
};

const offerContext: CodecContext = {
  key: 'offer_redemptions',
  pattern: 'offer_redemptions',
  params: {},
  timezone: 'UTC',
};

const countContext: CodecContext = {
  key: 'email_count',
  pattern: 'email_count',
  params: {},
  timezone: 'UTC',
};

const dateContext: CodecContext = {
  key: 'created_at',
  pattern: 'created_at',
  params: {},
  timezone: 'UTC',
};

describe('scalarCodec', () => {
  it('parses simple scalar comparisons', () => {
    expect(scalarCodec().parse(ast('status:paid'), statusContext)).toEqual({
      field: 'status',
      operator: 'is',
      values: ['paid'],
    });
    expect(scalarCodec().parse(ast('status:-paid'), statusContext)).toEqual({
      field: 'status',
      operator: 'is-not',
      values: ['paid'],
    });
  });

  it('serializes scalar comparisons', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'status',
      operator: 'is-not',
      values: ['paid'],
    };

    expect(scalarCodec().serialize(predicate, statusContext)).toEqual(['status:-paid']);
  });

  it('returns null for empty scalar values', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'status',
      operator: 'is',
      values: [],
    };

    expect(scalarCodec().serialize(predicate, statusContext)).toBeNull();
  });

  it('supports mapped NQL field names', () => {
    const authorCodec = scalarCodec({ field: 'member_id' });

    expect(authorCodec.parse(ast('member_id:abc123'), authorContext)).toEqual({
      field: 'author',
      operator: 'is',
      values: ['abc123'],
    });

    expect(
      authorCodec.serialize(
        {
          id: '1',
          field: 'author',
          operator: 'is-not',
          values: ['abc123'],
        },
        authorContext,
      ),
    ).toEqual(['member_id:-abc123']);
  });

  it('supports quoted string serialization for mapped resource fields', () => {
    const emailCodec = scalarCodec({ field: 'emails.post_id', quoteStrings: true });

    expect(
      emailCodec.serialize(
        {
          id: '1',
          field: 'emails.post_id',
          operator: 'is',
          values: ['post_123'],
        },
        {
          key: 'emails.post_id',
          pattern: 'emails.post_id',
          params: {},
          timezone: 'UTC',
        },
      ),
    ).toEqual(["emails.post_id:'post_123'"]);
  });

  it('quotes scalar strings with reserved NQL characters', () => {
    expect(
      scalarCodec().serialize(
        {
          id: '1',
          field: 'status',
          operator: 'is',
          values: ['-paid'],
        },
        statusContext,
      ),
    ).toEqual(["status:'-paid'"]);
  });
});

describe('textCodec', () => {
  it('parses regex-based text operators', () => {
    expect(textCodec().parse(ast("email:~'ghost'"), emailContext)).toEqual({
      field: 'email',
      operator: 'contains',
      values: ['ghost'],
    });
    expect(textCodec().parse(ast("email:-~$'ghost'"), emailContext)).toEqual({
      field: 'email',
      operator: 'does-not-end-with',
      values: ['ghost'],
    });
  });

  it('preserves regex escape sequences while unescaping literal punctuation', () => {
    expect(textCodec().parse(ast("email:~'g.ost'"), emailContext)).toEqual({
      field: 'email',
      operator: 'contains',
      values: ['g.ost'],
    });

    expect(textCodec().parse(ast("email:~'\\d'"), emailContext)).toEqual({
      field: 'email',
      operator: 'contains',
      values: ['\\d'],
    });
  });

  it('parses and serializes exact text operators', () => {
    expect(textCodec().parse(ast("email:'ghost@example.com'"), emailContext)).toEqual({
      field: 'email',
      operator: 'is',
      values: ['ghost@example.com'],
    });

    const predicate: FilterPredicate = {
      id: '1',
      field: 'email',
      operator: 'is',
      values: ['ghost@example.com'],
    };

    expect(textCodec().serialize(predicate, emailContext)).toEqual(["email:'ghost@example.com'"]);
  });

  it('serializes canonical text operators', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email',
      operator: 'starts-with',
      values: ["can't"],
    };

    expect(textCodec().serialize(predicate, emailContext)).toEqual(["email:~^'can\\'t'"]);
  });

  it('returns null for operators outside the text vocabulary', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email',
      operator: 'is-greater',
      values: ['ghost'],
    };

    expect(textCodec().serialize(predicate, emailContext)).toBeNull();
  });

  it('serializes the equality pair the vocabulary supports', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email',
      operator: 'is-not',
      values: ['ghost'],
    };

    expect(textCodec().serialize(predicate, emailContext)).toEqual(["email:-'ghost'"]);
  });

  it('does not serialize empty text values', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email',
      operator: 'is',
      values: [''],
    };

    expect(textCodec().serialize(predicate, emailContext)).toBeNull();
  });

  it('supports mapped NQL field names', () => {
    const bodyCodec = textCodec({ field: 'html' });

    expect(bodyCodec.parse(ast("html:~'ghost'"), bodyContext)).toEqual({
      field: 'body',
      operator: 'contains',
      values: ['ghost'],
    });

    expect(
      bodyCodec.serialize(
        {
          id: '1',
          field: 'body',
          operator: 'does-not-contain',
          values: ['ghost'],
        },
        bodyContext,
      ),
    ).toEqual(["html:-~'ghost'"]);
  });
});

describe('setCodec', () => {
  it('parses set membership operators', () => {
    expect(setCodec().parse(ast('label:[vip,alpha]'), labelContext)).toEqual({
      field: 'label',
      operator: 'is-any',
      values: ['vip', 'alpha'],
    });
    expect(setCodec().parse(ast('label:-[vip,alpha]'), labelContext)).toEqual({
      field: 'label',
      operator: 'is-not-any',
      values: ['vip', 'alpha'],
    });
  });

  it('parses singleton set values through scalar NQL operators', () => {
    expect(setCodec().parse(ast('label:vip'), labelContext)).toEqual({
      field: 'label',
      operator: 'is-any',
      values: ['vip'],
    });
    expect(setCodec().parse(ast('label:-vip'), labelContext)).toEqual({
      field: 'label',
      operator: 'is-not-any',
      values: ['vip'],
    });
  });

  it('serializes set membership canonically', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'label',
      operator: 'is-any',
      values: ['vip', 'alpha'],
    };

    expect(setCodec().serialize(predicate, labelContext)).toEqual(['label:[alpha,vip]']);
  });

  it('can serialize singleton string values as quoted scalars', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'offer_redemptions',
      operator: 'is-any',
      values: ['offer_123'],
    };

    expect(
      setCodec({ quoteStrings: true, serializeSingletonAsScalar: true }).serialize(
        predicate,
        offerContext,
      ),
    ).toEqual(["offer_redemptions:'offer_123'"]);
  });

  it('quotes set values that contain reserved list characters', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'label',
      operator: 'is-any',
      values: ['vip,alpha', 'beta'],
    };

    expect(setCodec().serialize(predicate, labelContext)).toEqual(["label:[beta,'vip,alpha']"]);
  });
});

describe('numberCodec', () => {
  it('parses numeric comparison operators', () => {
    expect(numberCodec().parse(ast('email_count:>5'), countContext)).toEqual({
      field: 'email_count',
      operator: 'is-greater',
      values: [5],
    });
    expect(numberCodec().parse(ast('email_count:10'), countContext)).toEqual({
      field: 'email_count',
      operator: 'is',
      values: [10],
    });
  });

  it('serializes numeric comparison operators', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email_count',
      operator: 'is-or-less',
      values: [10],
    };

    expect(numberCodec().serialize(predicate, countContext)).toEqual(['email_count:<=10']);
  });

  it('returns null for invalid numeric values', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email_count',
      operator: 'is',
      values: ['ten'],
    };

    expect(numberCodec().serialize(predicate, countContext)).toBeNull();
  });

  it('serializes numeric strings from the filter input', () => {
    const predicate: FilterPredicate = {
      id: '1',
      field: 'email_count',
      operator: 'is-or-less',
      values: ['10'],
    };

    expect(numberCodec().serialize(predicate, countContext)).toEqual(['email_count:<=10']);
  });
});

describe('dateCodec', () => {
  it('parses date comparison operators', () => {
    expect(dateCodec().parse(ast("created_at:<='2024-01-01T23:59:59.999Z'"), dateContext)).toEqual({
      field: 'created_at',
      operator: 'is-or-less',
      values: ['2024-01-01'],
    });

    expect(dateCodec().parse(ast("created_at:>'2024-01-01T23:59:59.999Z'"), dateContext)).toEqual({
      field: 'created_at',
      operator: 'is-greater',
      values: ['2024-01-01'],
    });
  });

  it('serializes date comparison operators using site timezone day bounds', () => {
    expect(
      dateCodec().serialize(
        {
          id: '1',
          field: 'created_at',
          operator: 'is-or-less',
          values: ['2024-02-01'],
        },
        {
          ...dateContext,
          timezone: 'Europe/Stockholm',
        },
      ),
    ).toEqual(["created_at:<='2024-02-01T22:59:59.999Z'"]);
  });

  it('returns null for invalid date values', () => {
    expect(dateCodec().parse(ast("created_at:<='not-a-date'"), dateContext)).toBeNull();
    expect(
      dateCodec().serialize(
        {
          id: '1',
          field: 'created_at',
          operator: 'is-or-less',
          values: ['not-a-date'],
        },
        dateContext,
      ),
    ).toBeNull();
  });
});
