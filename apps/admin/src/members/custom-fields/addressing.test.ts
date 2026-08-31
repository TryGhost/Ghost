import { describe, expect, it } from 'vitest';
import { customFieldAddressing } from './addressing';
import { parseFilterToAst } from '@/shared/filters';

function ast(filter: string) {
  const node = parseFilterToAst(filter);

  if (!node) {
    throw new Error(`could not parse: ${filter}`);
  }

  return node;
}

describe('customFieldAddressing bound to a key', () => {
  const bound = customFieldAddressing('shipping');

  it('claims a compound naming its own key', () => {
    expect(
      bound.matchCompound?.(ast("(custom_fields.key:'shipping'+custom_fields.value:~'x')")),
    ).not.toBeNull();
  });

  it('refuses a compound naming another field', () => {
    expect(
      bound.matchCompound?.(ast("(custom_fields.key:'billing'+custom_fields.value:~'x')")),
    ).toBeNull();
  });

  it('refuses a lone key clause naming another field', () => {
    expect(bound.matchCompound?.(ast("custom_fields.key:'billing'"))).toBeNull();
  });

  it('leaves other fields readable by the unbound template', () => {
    const template = customFieldAddressing();
    expect(
      template.matchCompound?.(ast("(custom_fields.key:'billing'+custom_fields.value:~'x')")),
    ).not.toBeNull();
  });
});
