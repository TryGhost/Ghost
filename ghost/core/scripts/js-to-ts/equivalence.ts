import ts from 'typescript';

import { getRequireSpecifier } from './codemod';
import { getModuleKind as defaultGetModuleKind, type ModuleKind } from './module-kind';

type GetModuleKind = (fromFile: string, specifier: string) => ModuleKind;

export type EquivalenceResult =
  | { equivalent: true }
  | { equivalent: false; reason: string; before?: string; after?: string };

const TSC_HELPERS = new Set([
  '__createBinding',
  '__setModuleDefault',
  '__importStar',
  '__importDefault',
]);

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

const factory = ts.factory;

class NotEquivalentError extends Error {}

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
}

function isUseStrict(statement: ts.Statement): boolean {
  return (
    ts.isExpressionStatement(statement) &&
    ts.isStringLiteral(statement.expression) &&
    statement.expression.text === 'use strict'
  );
}

function isIdentifierNamed(node: ts.Node, name: string): node is ts.Identifier {
  return ts.isIdentifier(node) && node.text === name;
}

/** `exports.name` */
function getExportsPropertyName(node: ts.Node): string | null {
  if (ts.isPropertyAccessExpression(node) && isIdentifierNamed(node.expression, 'exports')) {
    return node.name.text;
  }
  return null;
}

function requireCall(specifier: string): ts.CallExpression {
  return factory.createCallExpression(factory.createIdentifier('require'), undefined, [
    factory.createStringLiteral(specifier, true),
  ]);
}

function constStatement(name: ts.BindingName, initializer: ts.Expression): ts.VariableStatement {
  return factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [factory.createVariableDeclaration(name, undefined, undefined, initializer)],
      ts.NodeFlags.Const,
    ),
  );
}

/** `const {a: b, c: c} = require('x')` */
function destructuredRequire(
  bindings: Array<[string, string]>,
  specifier: string,
): ts.VariableStatement {
  return constStatement(
    factory.createObjectBindingPattern(
      bindings.map(([property, local]) => factory.createBindingElement(undefined, property, local)),
    ),
    requireCall(specifier),
  );
}

/**
 * A canonical stand-in for a module's exports, appended to both sides so
 * that export tables are compared regardless of where the exports happen.
 */
function exportsStatement(exportTable: Map<string, string>): ts.Statement[] {
  if (exportTable.size === 0) {
    return [];
  }
  const properties = [...exportTable.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([exported, local]) =>
      factory.createPropertyAssignment(exported, factory.createIdentifier(local)),
    );
  return [
    factory.createExpressionStatement(
      factory.createAssignment(
        factory.createPropertyAccessExpression(factory.createIdentifier('module'), 'exports'),
        factory.createObjectLiteralExpression(properties),
      ),
    ),
  ];
}

/**
 * Rewrites syntax that has more than one spelling into one of them, applied
 * to both sides: `{a}` becomes `{a: a}`, `const {a} = x` becomes
 * `const {a: a} = x`, and `const x = require('m').y` becomes
 * `const {y: x} = require('m')`.
 */
function canonicalize<T extends ts.Node>(root: T): T {
  const result = ts.transform(root, [
    (context) => {
      const visit = (node: ts.Node): ts.Node => {
        if (
          ts.isVariableStatement(node) &&
          node.declarationList.flags & ts.NodeFlags.Const &&
          node.declarationList.declarations.length === 1
        ) {
          const [{ name, initializer }] = node.declarationList.declarations;
          if (ts.isIdentifier(name) && initializer && ts.isPropertyAccessExpression(initializer)) {
            const specifier = getRequireSpecifier(initializer.expression);
            if (specifier !== null) {
              return destructuredRequire([[initializer.name.text, name.text]], specifier);
            }
          }
        }
        if (ts.isShorthandPropertyAssignment(node) && !node.objectAssignmentInitializer) {
          return factory.createPropertyAssignment(
            node.name.text,
            factory.createIdentifier(node.name.text),
          );
        }
        if (
          ts.isBindingElement(node) &&
          !node.propertyName &&
          !node.dotDotDotToken &&
          ts.isIdentifier(node.name) &&
          ts.isObjectBindingPattern(node.parent)
        ) {
          return factory.createBindingElement(
            undefined,
            node.name.text,
            node.name.text,
            node.initializer && (ts.visitNode(node.initializer, visit) as ts.Expression),
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit) as T;
    },
  ]);
  return result.transformed[0];
}

type Normalized = { sourceFile: ts.SourceFile; statements: readonly ts.Statement[] };

function normalized(statements: readonly ts.Statement[], sourceFile: ts.SourceFile): Normalized {
  const file = canonicalize(factory.updateSourceFile(sourceFile, statements));
  return { sourceFile: file, statements: file.statements };
}

/**
 * Serializes a syntax tree's structure, leaving out everything the printer
 * would carry over from the source text but that doesn't affect behavior:
 * formatting, comments, quote style, and trailing commas.
 */
function serialize(node: ts.Node): string {
  let extra = '';
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    extra = node.text;
  } else if (
    ts.isLiteralExpression(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    extra = JSON.stringify(node.text);
  } else if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
    extra = ts.SyntaxKind[node.operator];
  } else if (ts.isMetaProperty(node)) {
    extra = ts.SyntaxKind[node.keywordToken];
  } else if (ts.isVariableDeclarationList(node)) {
    extra = String(node.flags & ts.NodeFlags.BlockScoped);
  }
  const children: string[] = [];
  ts.forEachChild(node, (child) => {
    children.push(serialize(child));
  });
  return `${ts.SyntaxKind[node.kind]}(${extra})[${children.join(',')}]`;
}

/**
 * Normalizes the original CommonJS source: removes `'use strict'` and replaces
 * a trailing `module.exports = {...}` with the canonical export statement.
 */
function normalizeOriginal(fileName: string, source: string): Normalized {
  const sourceFile = parse(fileName, source);
  const statements: ts.Statement[] = [];
  const exportTable = new Map<string, string>();

  sourceFile.statements.forEach((statement, index) => {
    if (index === 0 && isUseStrict(statement)) {
      return;
    }

    if (
      index === sourceFile.statements.length - 1 &&
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(statement.expression.left) &&
      isIdentifierNamed(statement.expression.left.expression, 'module') &&
      statement.expression.left.name.text === 'exports' &&
      ts.isObjectLiteralExpression(statement.expression.right)
    ) {
      const table = new Map<string, string>();
      const isTable = statement.expression.right.properties.every((property) => {
        if (ts.isShorthandPropertyAssignment(property)) {
          table.set(property.name.text, property.name.text);
          return true;
        }
        if (
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          ts.isIdentifier(property.initializer)
        ) {
          table.set(property.name.text, property.initializer.text);
          return true;
        }
        return false;
      });
      if (isTable) {
        table.forEach((local, exported) => exportTable.set(exported, local));
        return;
      }
    }

    statements.push(statement);
  });

  return normalized([...statements, ...exportsStatement(exportTable)], sourceFile);
}

type ImportInfo = {
  specifier: string;
  defaultName?: string;
  namespaceName?: string;
  named: Array<[string, string]>;
};

function getImports(tsFileName: string, tsSource: string): ImportInfo[] {
  const sourceFile = ts.createSourceFile(
    tsFileName,
    tsSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports: ImportInfo[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const info: ImportInfo = { specifier: statement.moduleSpecifier.text, named: [] };
    const clause = statement.importClause;
    if (clause?.isTypeOnly) {
      throw new NotEquivalentError('type-only imports are not supported');
    }
    if (clause?.name) {
      info.defaultName = clause.name.text;
    }
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      info.namespaceName = bindings.name.text;
    } else if (bindings) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) {
          throw new NotEquivalentError('type-only imports are not supported');
        }
        info.named.push([(element.propertyName ?? element.name).text, element.name.text]);
      }
    }
    imports.push(info);
  }
  return imports;
}

/**
 * Normalizes TypeScript's CommonJS output back into the shape of the
 * original source. Each `import` compiles to a `require` bound to a
 * temporary (`const x_1 = __importDefault(require('x'))`) whose uses read
 * properties of it (`x_1.default`, `(0, x_1.y)(...)`). This turns each back
 * into the `require` it's equivalent to, and each use back into the local
 * name, but only where the compiled form really is equivalent to a
 * `require`: `__importDefault(m).default` is `m` only if `m` isn't flagged
 * `__esModule`, and `__importStar(m)` is `m` only if it is.
 */
function normalizeCompiled(
  originalFileName: string,
  compiled: string,
  imports: ImportInfo[],
  getModuleKind: GetModuleKind,
): Normalized {
  const sourceFile = parse(originalFileName, compiled);
  const statements: ts.Statement[] = [];
  const exportTable = new Map<string, string>();
  // temporary name -> (property name -> local name)
  const temporaries = new Map<string, Map<string, string>>();
  const remainingImports = [...imports];

  // Imports compile to `require`s in order. A `require` with no import left
  // to match was in the source as a `require`.
  const takeImport = (specifier: string): ImportInfo | undefined => {
    const index = remainingImports.findIndex((info) => info.specifier === specifier);
    return index === -1 ? undefined : remainingImports.splice(index, 1)[0];
  };

  const getKind = (specifier: string): ModuleKind => {
    const kind = getModuleKind(originalFileName, specifier);
    if (kind === 'unknown') {
      throw new NotEquivalentError(`could not resolve ${specifier}`);
    }
    return kind;
  };

  for (const statement of sourceFile.statements) {
    if (isUseStrict(statement)) {
      continue;
    }

    // var __importDefault = (this && this.__importDefault) || ...
    if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.every(
        (declaration) =>
          ts.isIdentifier(declaration.name) && TSC_HELPERS.has(declaration.name.text),
      )
    ) {
      continue;
    }

    if (ts.isExpressionStatement(statement)) {
      const { expression } = statement;

      // Object.defineProperty(exports, "__esModule", { value: true });
      if (
        ts.isCallExpression(expression) &&
        expression.getText(sourceFile).replace(/\s/g, '') ===
          'Object.defineProperty(exports,"__esModule",{value:true})'
      ) {
        continue;
      }

      // exports.a = exports.b = void 0;
      if (ts.isBinaryExpression(expression) && getExportsPropertyName(expression.left) !== null) {
        let current: ts.Expression = expression;
        while (
          ts.isBinaryExpression(current) &&
          current.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          getExportsPropertyName(current.left) !== null
        ) {
          current = current.right;
        }
        if (ts.isVoidExpression(current)) {
          continue;
        }
        // exports.a = a;
        if (
          ts.isIdentifier(expression.right) &&
          expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          exportTable.set(getExportsPropertyName(expression.left)!, expression.right.text);
          continue;
        }
      }
    }

    // const x_1 = __importDefault(require("x"));
    // const x = __importStar(require("x"));
    // const x_1 = require("x");
    if (ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1) {
      const [declaration] = statement.declarationList.declarations;
      const { initializer, name } = declaration;
      if (initializer && ts.isIdentifier(name)) {
        let helper: string | null = null;
        let call: ts.Expression = initializer;
        if (
          ts.isCallExpression(initializer) &&
          ts.isIdentifier(initializer.expression) &&
          TSC_HELPERS.has(initializer.expression.text) &&
          initializer.arguments.length === 1
        ) {
          helper = initializer.expression.text;
          call = initializer.arguments[0];
        }
        const specifier = getRequireSpecifier(call);
        const info = specifier === null ? undefined : takeImport(specifier);
        if (specifier !== null && info) {
          const temporary = name.text;

          if (
            helper === '__importDefault' &&
            info.defaultName &&
            !info.namespaceName &&
            !info.named.length
          ) {
            const local = info.defaultName;
            temporaries.set(temporary, new Map([['default', local]]));
            statements.push(
              getKind(specifier) === 'esm'
                ? destructuredRequire([['default', local]], specifier)
                : constStatement(factory.createIdentifier(local), requireCall(specifier)),
            );
            continue;
          }
          if (helper === '__importStar' && info.namespaceName === temporary && !info.defaultName) {
            if (getKind(specifier) !== 'esm') {
              throw new NotEquivalentError(
                `${specifier} is not an ES module, so \`import *\` copies it`,
              );
            }
            statements.push(
              constStatement(factory.createIdentifier(temporary), requireCall(specifier)),
            );
            continue;
          }
          if (helper === null && !info.defaultName && !info.namespaceName && info.named.length) {
            getKind(specifier);
            temporaries.set(temporary, new Map(info.named));
            statements.push(destructuredRequire(info.named, specifier));
            continue;
          }
          throw new NotEquivalentError(`unsupported import form for ${specifier}`);
        }
      }
    }

    // require("x");
    if (ts.isExpressionStatement(statement)) {
      const specifier = getRequireSpecifier(statement.expression);
      const info = specifier === null ? undefined : takeImport(specifier);
      if (info) {
        if (info.defaultName || info.namespaceName || info.named.length) {
          throw new NotEquivalentError(`unsupported import form for ${specifier}`);
        }
        statements.push(statement);
        continue;
      }
    }

    statements.push(statement);
  }

  const replaceTemporaryReferences = (context: ts.TransformationContext) => {
    const getLocal = (node: ts.Node): string | undefined => {
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        return temporaries.get(node.expression.text)?.get(node.name.text);
      }
      return undefined;
    };
    const visit = (node: ts.Node): ts.Node => {
      // (0, x_1.y)
      if (
        ts.isParenthesizedExpression(node) &&
        ts.isBinaryExpression(node.expression) &&
        node.expression.operatorToken.kind === ts.SyntaxKind.CommaToken &&
        ts.isNumericLiteral(node.expression.left) &&
        node.expression.left.text === '0'
      ) {
        const local = getLocal(node.expression.right);
        if (local) {
          return factory.createIdentifier(local);
        }
      }
      // x_1.y
      const local = getLocal(node);
      if (local) {
        return factory.createIdentifier(local);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node: ts.SourceFile) => ts.visitNode(node, visit) as ts.SourceFile;
  };

  const withoutHelpers = factory.updateSourceFile(sourceFile, statements);
  const replaced = ts.transform(withoutHelpers, [replaceTemporaryReferences]).transformed[0];
  return normalized([...replaced.statements, ...exportsStatement(exportTable)], sourceFile);
}

/**
 * Identifiers that behave differently in an ES module than in the CommonJS
 * module the compiled output pretends to be.
 */
function findCommonJsOnlyReference(tsFileName: string, tsSource: string): string | null {
  const sourceFile = ts.createSourceFile(
    tsFileName,
    tsSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found: string | null = null;
  const visit = (node: ts.Node) => {
    if (found) {
      return;
    }
    if (
      ts.isIdentifier(node) &&
      (node.text === 'module' || node.text === 'exports') &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
      !(ts.isPropertyAssignment(node.parent) && node.parent.name === node) &&
      !(ts.isBindingElement(node.parent) && node.parent.propertyName === node)
    ) {
      found = node.text;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * Whether no `import` follows a statement that could have side effects.
 * ESM hoists imports but TypeScript's CommonJS output doesn't, so this
 * makes sure the compiled output's order is the order that really runs.
 */
function findUnhoistableImport(
  tsFileName: string,
  tsSource: string,
  isPureStatement: (statement: ts.Statement) => boolean,
): string | null {
  const sourceFile = ts.createSourceFile(
    tsFileName,
    tsSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let sawImpureStatement = false;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (sawImpureStatement) {
        return statement.getText(sourceFile);
      }
    } else if (!ts.isExportDeclaration(statement) && !isPureStatement(statement)) {
      sawImpureStatement = true;
    }
  }
  return null;
}

/**
 * Compiles `tsSource` with TypeScript and checks that the result is
 * equivalent to `originalSource`, ignoring formatting, comments, and the
 * differences that ES module interop introduces where they can't change
 * behavior (see `normalizeCompiled`).
 *
 * Two differences are accepted as equivalent: an ES module is always in
 * strict mode, and named imports are live bindings rather than a snapshot
 * taken at `require` time.
 */
export function checkEquivalence(
  originalFileName: string,
  originalSource: string,
  tsFileName: string,
  tsSource: string,
  compilerOptions: ts.CompilerOptions,
  isPureStatement: (statement: ts.Statement) => boolean,
  getModuleKind: GetModuleKind = defaultGetModuleKind,
): EquivalenceResult {
  const commonJsOnlyReference = findCommonJsOnlyReference(tsFileName, tsSource);
  if (commonJsOnlyReference) {
    return { equivalent: false, reason: `references \`${commonJsOnlyReference}\`` };
  }
  const unhoistableImport = findUnhoistableImport(tsFileName, tsSource, isPureStatement);
  if (unhoistableImport) {
    return { equivalent: false, reason: `import follows side effects: ${unhoistableImport}` };
  }

  const { outputText, diagnostics } = ts.transpileModule(tsSource, {
    fileName: tsFileName,
    reportDiagnostics: true,
    compilerOptions: {
      ...compilerOptions,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      removeComments: true,
      sourceMap: false,
      inlineSourceMap: false,
      noEmit: false,
      declaration: false,
    },
  });
  if (diagnostics?.length) {
    return {
      equivalent: false,
      reason: `does not compile: ${ts.flattenDiagnosticMessageText(diagnostics[0].messageText, ' ')}`,
    };
  }

  let before: Normalized;
  let after: Normalized;
  try {
    before = normalizeOriginal(originalFileName, originalSource);
    after = normalizeCompiled(
      originalFileName,
      outputText,
      getImports(tsFileName, tsSource),
      getModuleKind,
    );
  } catch (error) {
    if (error instanceof NotEquivalentError) {
      return { equivalent: false, reason: error.message };
    }
    throw error;
  }

  const length = Math.max(before.statements.length, after.statements.length);
  for (let index = 0; index < length; index++) {
    const beforeStatement = before.statements[index];
    const afterStatement = after.statements[index];
    if (
      !beforeStatement ||
      !afterStatement ||
      serialize(beforeStatement) !== serialize(afterStatement)
    ) {
      const describe = (statement: ts.Statement | undefined, sourceFile: ts.SourceFile) =>
        statement ? printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile) : '<none>';
      return {
        equivalent: false,
        reason: 'compiled output differs',
        before: describe(beforeStatement, before.sourceFile),
        after: describe(afterStatement, after.sourceFile),
      };
    }
  }
  return { equivalent: true };
}
