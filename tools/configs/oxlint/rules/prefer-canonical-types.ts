import type { CreateRule, ESTree } from '@oxlint/plugins';

// Hand-written copies of a library's type drift from it and get copied into new
// code, so match each known shape by its members rather than by its name.
interface CanonicalType {
  label: string;
  members: ReadonlySet<string>;
  typescript: string;
  jsdoc: string;
}

const canonicalTypes: CanonicalType[] = [
  {
    label: 'logger',
    members: new Set(['debug', 'info', 'warn', 'error', 'fatal', 'trace']),
    typescript: "import type { GhostLogger } from '@tryghost/logging' (or Pick<GhostLogger, ...>)",
    jsdoc: "import('@tryghost/logging').GhostLogger",
  },
];

type Signature = ESTree.TSSignature;

function memberName(member: Signature): string | undefined {
  if (member.type !== 'TSMethodSignature' && member.type !== 'TSPropertySignature') return;
  if (member.computed) return;
  if (member.key.type === 'Identifier') return member.key.name;
  if (member.key.type === 'Literal' && typeof member.key.value === 'string')
    return member.key.value;
  return undefined;
}

function isCallable(member: Signature) {
  if (member.type === 'TSMethodSignature') return member.kind === 'method';
  if (member.type !== 'TSPropertySignature') return false;
  const annotation = member.typeAnnotation?.typeAnnotation;
  return (
    annotation?.type === 'TSFunctionType' ||
    (annotation?.type === 'TSTypeReference' &&
      annotation.typeName.type === 'Identifier' &&
      annotation.typeName.name === 'Function')
  );
}

function match(members: { name: string | undefined; callable: boolean }[]) {
  if (members.length === 0) return;
  return canonicalTypes.find((canonical) =>
    members.every(({ name, callable }) => callable && name && canonical.members.has(name)),
  );
}

// JSDoc types are not parsed, so read their object literals by bracket depth.
// The `>` of an arrow (`=>`) does not close anything.
function depthChange(text: string, index: number) {
  const character = text.charAt(index);
  if ('{([<'.includes(character)) return 1;
  if ('})]>'.includes(character) && text.charAt(index - 1) !== '=') return -1;
  return 0;
}

function closing(text: string, start: number) {
  let depth = 0;
  for (let index = start; index < text.length; index++) {
    depth += depthChange(text, index);
    if (depth === 0) return index;
  }
  return -1;
}

// A line that opens with a member name, after any comment-line `*`. An
// `import('...')` type there continues the previous member's type; a method
// named `import` does not.
const memberStart = /^\s*\**\s*(?!import\s*\(\s*['"`])(?:readonly\s+)?[A-Za-z_$][\w$]*\??\s*[:(]/;

function splitMembers(body: string) {
  const members: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < body.length; index++) {
    const change = depthChange(body, index);
    depth += change;
    const character = body.charAt(index);
    // Newlines separate members too, unless the next line continues a value.
    const separator =
      ',;'.includes(character) || (character === '\n' && memberStart.test(body.slice(index + 1)));
    if (change === 0 && depth === 0 && separator) {
      members.push(body.slice(start, index));
      start = index + 1;
    }
  }
  members.push(body.slice(start));
  // Members on their own comment lines keep the leading `*`.
  return members.map((member) => member.replace(/^\s*\*+/gm, '').trim()).filter(Boolean);
}

function jsdocMember(member: string) {
  const method = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*\(/.exec(member);
  if (method) return { name: method[1], callable: true };
  const property = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:\s*(.*)$/s.exec(member);
  if (!property) return { name: undefined, callable: false };
  const value = (property[2] ?? '').trim();
  return {
    name: property[1],
    callable: value === 'Function' || (value.startsWith('(') && /\)\s*=>/.test(value)),
  };
}

// Yields each `{...}` object literal type, outermost first, with its offset.
function* objectTypes(text: string, offset = 0): Generator<[string, number]> {
  for (let index = text.indexOf('{'); index !== -1; index = text.indexOf('{', index + 1)) {
    const end = closing(text, index);
    if (end === -1) return;
    yield [text.slice(index + 1, end), offset + index + 1];
    yield* objectTypes(text.slice(index + 1, end), offset + index + 1);
    index = end;
  }
}

export const preferCanonicalTypes: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: "Use a library's own type instead of a hand-written copy of its shape",
    },
    schema: [],
    messages: {
      typescript:
        'This hand-written {{label}} type duplicates a library type. Use {{replacement}}.',
      jsdoc: 'This JSDoc {{label}} type duplicates a library type. Use {{replacement}}.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function check(node: ESTree.Node, signatures: Signature[]) {
      const canonical = match(
        signatures.map((member) => ({ name: memberName(member), callable: isCallable(member) })),
      );
      if (canonical) {
        context.report({
          node,
          messageId: 'typescript',
          data: { label: canonical.label, replacement: canonical.typescript },
        });
      }
    }

    return {
      TSTypeLiteral(node) {
        check(node, node.members);
      },
      TSInterfaceDeclaration(node) {
        if (node.extends.length === 0) check(node, node.body.body);
      },
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== 'Block' || !comment.value.startsWith('*')) continue;
          // Read only tag types, such as `@param {...}` or `@typedef {...}`.
          const tag = /@[A-Za-z]+\s*\{/g;
          for (let found = tag.exec(comment.value); found; found = tag.exec(comment.value)) {
            const start = found.index + found[0].length - 1;
            const end = closing(comment.value, start);
            if (end === -1) break;
            const type = comment.value.slice(start + 1, end);
            const typeOffset = comment.start + 2 + start + 1;
            for (const [body, bodyOffset] of objectTypes(type, typeOffset)) {
              const canonical = match(splitMembers(body).map(jsdocMember));
              if (!canonical) continue;
              context.report({
                loc: {
                  start: sourceCode.getLocFromIndex(bodyOffset - 1),
                  end: sourceCode.getLocFromIndex(bodyOffset + body.length + 1),
                },
                messageId: 'jsdoc',
                data: { label: canonical.label, replacement: canonical.jsdoc },
              });
            }
            tag.lastIndex = end;
          }
        }
      },
    };
  },
};
