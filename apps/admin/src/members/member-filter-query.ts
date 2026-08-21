import {
  type AstNode,
  type FilterPredicate,
  type ParsedPredicate,
  dispatchSimpleNodes,
  getFieldKeysByType,
  hasFieldKey,
  parseFilterToAst,
  resolveField,
  serializePredicates,
  stampPredicates,
} from '@/shared/filters';
import { memberFields } from './member-fields';
import type { MemberFields } from './member-fields';

type CompoundMatcher = (node: AstNode) => ParsedPredicate | null;
const TIMEZONE_SENSITIVE_MEMBER_FIELDS = getFieldKeysByType(memberFields, 'date');

/**
 * Is this predicate's operator one the field currently advertises?
 *
 * This returns `false` for predicates the user can't reach in the UI because
 * the field never declares the operator. Hooks call this to drop unreachable
 * predicates before serializing or after parsing. The parser/serializer
 * themselves stay pure.
 */
export function isPredicateEnabled(predicate: ParsedPredicate, fields: MemberFields): boolean {
  const resolved = resolveField(fields, predicate.field, 'UTC');
  return resolved?.definition.operators.includes(predicate.operator) ?? false;
}

function getCompoundChildren(
  node: AstNode,
): { operator: '$and' | '$or'; children: AstNode[] } | null {
  if (Array.isArray(node.$and)) {
    return { operator: '$and', children: node.$and as AstNode[] };
  }

  if (Array.isArray(node.$or)) {
    return { operator: '$or', children: node.$or as AstNode[] };
  }

  return null;
}

function matchSubscribedNode(node: AstNode): ParsedPredicate | null {
  if (typeof node.subscribed === 'boolean') {
    return {
      field: 'subscribed',
      operator: 'is',
      values: [node.subscribed ? 'subscribed' : 'unsubscribed'],
    };
  }

  if (typeof node.email_disabled === 'number') {
    if (node.email_disabled === 1) {
      return {
        field: 'subscribed',
        operator: 'is',
        values: ['email-disabled'],
      };
    }

    if (node.email_disabled === 0) {
      return {
        field: 'subscribed',
        operator: 'is-not',
        values: ['email-disabled'],
      };
    }
  }

  const compound = getCompoundChildren(node);

  if (!compound || compound.children.length !== 2) {
    return null;
  }

  let subscribedValue: boolean | undefined;
  let emailDisabledValue: number | undefined;

  for (const child of compound.children) {
    if (typeof child.subscribed === 'boolean') {
      subscribedValue = child.subscribed;
    }

    if (typeof child.email_disabled === 'number') {
      emailDisabledValue = child.email_disabled;
    }
  }

  if (compound.operator === '$and' && emailDisabledValue === 0 && subscribedValue !== undefined) {
    return {
      field: 'subscribed',
      operator: 'is',
      values: [subscribedValue ? 'subscribed' : 'unsubscribed'],
    };
  }

  if (compound.operator === '$or' && emailDisabledValue === 1 && subscribedValue !== undefined) {
    return {
      field: 'subscribed',
      operator: 'is-not',
      values: [subscribedValue ? 'unsubscribed' : 'subscribed'],
    };
  }

  return null;
}

function matchNewsletterGroupedNode(node: AstNode): ParsedPredicate | null {
  const compound = getCompoundChildren(node);

  if (!compound || compound.children.length !== 2) {
    return null;
  }

  let slug: string | undefined;
  let slugNegated = false;
  let hasEmailDisabled = false;

  for (const child of compound.children) {
    const newsletterSlug = child['newsletters.slug'];

    if (typeof newsletterSlug === 'string') {
      slug = newsletterSlug;
      slugNegated = false;
    }

    if (
      newsletterSlug &&
      typeof newsletterSlug === 'object' &&
      !Array.isArray(newsletterSlug) &&
      typeof (newsletterSlug as Record<string, unknown>).$ne === 'string'
    ) {
      slug = (newsletterSlug as Record<string, string>).$ne;
      slugNegated = true;
    }

    if (typeof child.email_disabled === 'number') {
      hasEmailDisabled = true;
    }
  }

  if (!slug || !hasEmailDisabled) {
    return null;
  }

  // The slug clause's polarity is the subscription state. Serialize pairs it
  // with a fixed join + email_disabled shape, but hand-written filters may
  // pair them differently; the email_disabled clause only marks the compound
  // as a newsletter subscription filter and never flips its meaning.
  return {
    field: `newsletters.${slug}`,
    operator: 'is',
    values: [slugNegated ? 'unsubscribed' : 'subscribed'],
  };
}

function matchFeedbackGroupedNode(node: AstNode): ParsedPredicate | null {
  const compound = getCompoundChildren(node);

  if (!compound || compound.operator !== '$and' || compound.children.length !== 2) {
    return null;
  }

  let postId: string | undefined;
  let score: number | undefined;

  for (const child of compound.children) {
    if (typeof child['feedback.post_id'] === 'string') {
      postId = child['feedback.post_id'];
    }

    if (typeof child['feedback.score'] === 'number') {
      score = child['feedback.score'];
    }
  }

  if (!postId || (score !== 0 && score !== 1)) {
    return null;
  }

  return {
    field: 'newsletter_feedback',
    operator: String(score),
    values: [postId],
  };
}

// A trailing `$` is an end anchor only when it isn't escaped: a value containing
// a literal `$` (contains `5$`) reaches here as the source `5\$`, which must not
// be read as ends-with. An odd run of backslashes before the `$` escapes it.
function endsWithAnchor(source: string): boolean {
  if (!source.endsWith('$')) {
    return false;
  }
  let backslashes = 0;
  for (let i = source.length - 2; i >= 0 && source[i] === '\\'; i -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 0;
}

// A regex value read back into a text operator by its anchors, mirroring the
// serialize symbols in member-fields.ts (`~` contains, `~^` starts, `~$` ends).
// A literal `^` in a value is escaped to `\^` so it never leads, but a literal
// `$` escapes to `\$` and still ends the source, hence the anchor check above.
// `$not` is only ever emitted by `does-not-contain` (an unanchored regex), so a
// negated pattern always maps back to that operator.
function regexToOperator(pattern: RegExp, negated: boolean): { operator: string; value: string } {
  const source = pattern.source;
  const startsWith = source.startsWith('^');
  const endsWith = endsWithAnchor(source);

  let base: string;
  let body: string;
  if (startsWith && !endsWith) {
    base = 'starts-with';
    body = source.slice(1);
  } else if (endsWith && !startsWith) {
    base = 'ends-with';
    body = source.slice(0, -1);
  } else {
    base = 'contains';
    body = source;
  }

  const value = body.replace(/\\([\\.^$|?*+()[\]{}/-])/g, '$1');
  return { operator: negated ? 'does-not-contain' : base, value };
}

// The value NQL a custom-field predicate carries, read back into a (operator,
// value) pair. nql represents `:~x` as {$regex: /x/} and its negation as
// {$not: /x/}; a bare string is `is` and {$ne} is `is-not`. Returns null for a
// shape we don't emit.
function interpretCustomFieldValue(raw: unknown): { operator: string; value: string } | null {
  if (typeof raw === 'string') {
    return { operator: 'is', value: raw };
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const object = raw as Record<string, unknown>;

    if (typeof object.$ne === 'string') {
      return { operator: 'is-not', value: object.$ne };
    }

    if (object.$regex instanceof RegExp) {
      return regexToOperator(object.$regex, false);
    }

    if (object.$not instanceof RegExp) {
      return regexToOperator(object.$not, true);
    }
  }

  return null;
}

// A custom-field filter is `(custom_fields.key:'<key>'+custom_fields.value[.sub]:<v>)`,
// or the flat `custom_fields.key:'<key>'` / `:-'<key>'` for set / not set. Each field
// is its own predicate keyed `custom_fields.<key>`, so the field's stable key becomes
// part of the predicate field and the remaining `values` are [subfield, value]
// (subfield '' for a scalar field or the whole-field set/unset case). This can't ride
// the generic parser because the key lives in the value of the key clause, not the key.
function matchCustomFieldNode(node: AstNode): ParsedPredicate | null {
  const compound = getCompoundChildren(node);

  if (!compound) {
    const keyValue = node['custom_fields.key'];

    if (typeof keyValue === 'string') {
      return { field: `custom_fields.${keyValue}`, operator: 'is-set', values: ['', ''] };
    }

    if (
      keyValue &&
      typeof keyValue === 'object' &&
      !Array.isArray(keyValue) &&
      typeof (keyValue as Record<string, unknown>).$ne === 'string'
    ) {
      return {
        field: `custom_fields.${(keyValue as Record<string, string>).$ne}`,
        operator: 'is-not-set',
        values: ['', ''],
      };
    }

    return null;
  }

  if (compound.operator !== '$and' || compound.children.length !== 2) {
    return null;
  }

  let fieldKey: string | undefined;
  let valueEntry: { subfield: string; raw: unknown } | undefined;
  let pathEntry: { subfield: string; negated: boolean } | undefined;

  for (const child of compound.children) {
    if (typeof child['custom_fields.key'] === 'string') {
      fieldKey = child['custom_fields.key'];
    }

    for (const childKey of Object.keys(child)) {
      if (childKey === 'custom_fields.value') {
        valueEntry = { subfield: '', raw: child[childKey] };
      } else if (childKey.startsWith('custom_fields.value.')) {
        valueEntry = {
          subfield: childKey.slice('custom_fields.value.'.length),
          raw: child[childKey],
        };
      } else if (childKey === 'custom_fields.path') {
        const raw = child[childKey];

        if (typeof raw === 'string') {
          pathEntry = { subfield: raw, negated: false };
        } else if (
          raw &&
          typeof raw === 'object' &&
          !Array.isArray(raw) &&
          typeof (raw as Record<string, unknown>).$ne === 'string'
        ) {
          pathEntry = { subfield: (raw as Record<string, string>).$ne, negated: true };
        }
      }
    }
  }

  if (!fieldKey) {
    return null;
  }

  // A `path` clause is a part's set / not-set: its presence, carrying no value.
  if (pathEntry) {
    return {
      field: `custom_fields.${fieldKey}`,
      operator: pathEntry.negated ? 'is-not-set' : 'is-set',
      values: [pathEntry.subfield, ''],
    };
  }

  if (!valueEntry) {
    return null;
  }

  const interpreted = interpretCustomFieldValue(valueEntry.raw);

  if (!interpreted) {
    return null;
  }

  return {
    field: `custom_fields.${fieldKey}`,
    operator: interpreted.operator,
    values: [valueEntry.subfield, interpreted.value],
  };
}

const MEMBER_COMPOUND_MATCHERS: CompoundMatcher[] = [
  matchSubscribedNode,
  matchNewsletterGroupedNode,
  matchFeedbackGroupedNode,
  matchCustomFieldNode,
];

function parseMemberNode(node: AstNode, timezone: string): ParsedPredicate[] {
  for (const matcher of MEMBER_COMPOUND_MATCHERS) {
    const parsed = matcher(node);

    if (parsed) {
      return [parsed];
    }
  }

  const compound = getCompoundChildren(node);

  if (compound?.operator === '$and') {
    return compound.children.flatMap((child) => parseMemberNode(child, timezone));
  }

  return dispatchSimpleNodes([node], memberFields, timezone);
}

/**
 * Parses NQL into predicates. Pure: callers are responsible for filtering the
 * output via `isPredicateEnabled` against the field map they want to enforce.
 */
export function parseMemberFilter(filter: string | undefined, timezone: string): FilterPredicate[] {
  const ast = parseFilterToAst(filter ?? '');

  if (!ast) {
    return [];
  }

  return stampPredicates(parseMemberNode(ast, timezone));
}

export function hasTimezoneSensitiveMemberFilter(filter: string | undefined): boolean {
  const ast = parseFilterToAst(filter ?? '');

  if (!ast) {
    return false;
  }

  return hasFieldKey(ast, TIMEZONE_SENSITIVE_MEMBER_FIELDS);
}

/**
 * Serializes predicates back to NQL. Pure: callers should pre-filter via
 * `isPredicateEnabled` if they need to drop predicates the field map doesn't
 * advertise.
 */
export function serializeMemberFilters(
  predicates: FilterPredicate[],
  timezone: string,
): string | undefined {
  return serializePredicates(predicates, memberFields, timezone);
}
