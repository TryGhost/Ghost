import ts from 'typescript';

import { getModuleKind as defaultGetModuleKind, type ModuleKind } from './module-kind';

export type CodemodResult = { ok: true; output: string } | { ok: false; reason: string };

type GetModuleKind = (fromFile: string, specifier: string) => ModuleKind;

type Edit = { start: number; end: number; text: string };

/**
 * Returns the specifier of a `require('specifier')` call, or null if `node`
 * is anything else.
 */
export function getRequireSpecifier(node: ts.Node): string | null {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'require' &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0].text;
  }
  return null;
}

/**
 * Whether evaluating `node` can't run code, throw, or observe anything, so
 * that hoisting an `import` above it doesn't change behavior.
 */
function isPureExpression(node: ts.Expression): boolean {
  if (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    ts.isBigIntLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isRegularExpressionLiteral(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node)
  ) {
    return true;
  }
  switch (node.kind) {
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
      return true;
  }
  if (ts.isIdentifier(node)) {
    return node.text === 'undefined';
  }
  if (ts.isParenthesizedExpression(node)) {
    return isPureExpression(node.expression);
  }
  if (ts.isPrefixUnaryExpression(node)) {
    return (
      [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken, ts.SyntaxKind.ExclamationToken].includes(
        node.operator,
      ) && isPureExpression(node.operand)
    );
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every(
      (element) => !ts.isSpreadElement(element) && isPureExpression(element),
    );
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every((property) => {
      if (property.name && ts.isComputedPropertyName(property.name)) {
        return false;
      }
      if (ts.isPropertyAssignment(property)) {
        return isPureExpression(property.initializer);
      }
      return (
        ts.isMethodDeclaration(property) ||
        ts.isGetAccessorDeclaration(property) ||
        ts.isSetAccessorDeclaration(property)
      );
    });
  }
  return false;
}

/**
 * Whether `statement` can be moved after the module's imports without
 * changing behavior. ESM hoists imports, so anything that precedes an
 * `import` in the output must be pure.
 */
export function isPureStatement(statement: ts.Statement): boolean {
  if (ts.isFunctionDeclaration(statement) || ts.isEmptyStatement(statement)) {
    return true;
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.every(
      (declaration) =>
        ts.isIdentifier(declaration.name) &&
        (!declaration.initializer || isPureExpression(declaration.initializer)),
    );
  }
  return false;
}

function hasComment(sourceFile: ts.SourceFile, node: ts.Node): boolean {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    sourceFile.text.slice(node.getStart(sourceFile), node.end),
  );
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      return true;
    }
  }
  return false;
}

type ConvertedImport = { text: string; localNames: string[] };

/**
 * Converts a top-level `require` statement to an equivalent `import`, or
 * returns null if the statement isn't one we know how to convert safely.
 */
function convertRequireStatement(
  sourceFile: ts.SourceFile,
  statement: ts.Statement,
  getModuleKind: GetModuleKind,
): ConvertedImport | null {
  if (hasComment(sourceFile, statement)) {
    return null;
  }

  // require('x');
  if (ts.isExpressionStatement(statement)) {
    const specifier = getRequireSpecifier(statement.expression);
    if (specifier === null) {
      return null;
    }
    const quoted = (statement.expression as ts.CallExpression).arguments[0].getText(sourceFile);
    return { text: `import ${quoted};`, localNames: [] };
  }

  if (!ts.isVariableStatement(statement) || statement.modifiers?.length) {
    return null;
  }
  const { declarationList } = statement;
  if (!(declarationList.flags & ts.NodeFlags.Const) || declarationList.declarations.length !== 1) {
    return null;
  }
  const [declaration] = declarationList.declarations;
  const { initializer, name } = declaration;
  if (!initializer || declaration.type || declaration.exclamationToken) {
    return null;
  }

  // const x = require('x').y;
  let requireCall: ts.Expression = initializer;
  let property: string | null = null;
  if (ts.isPropertyAccessExpression(initializer) && ts.isIdentifier(initializer.name)) {
    requireCall = initializer.expression;
    property = initializer.name.text;
  }
  const specifier = getRequireSpecifier(requireCall);
  if (specifier === null) {
    return null;
  }
  const quoted = (requireCall as ts.CallExpression).arguments[0].getText(sourceFile);
  const kind = getModuleKind(sourceFile.fileName, specifier);
  if (kind === 'unknown') {
    return null;
  }

  if (ts.isIdentifier(name)) {
    const local = name.text;
    if (property === null) {
      // const x = require('x');
      const clause = kind === 'esm' ? `* as ${local}` : local;
      return { text: `import ${clause} from ${quoted};`, localNames: [local] };
    }
    if (property === 'default') {
      // const x = require('x').default;
      if (kind !== 'esm') {
        return null;
      }
      return { text: `import ${local} from ${quoted};`, localNames: [local] };
    }
    const binding = property === local ? local : `${property} as ${local}`;
    return { text: `import { ${binding} } from ${quoted};`, localNames: [local] };
  }

  // const {a, b: c} = require('x');
  if (property !== null || !ts.isObjectBindingPattern(name) || name.elements.length === 0) {
    return null;
  }
  const bindings: string[] = [];
  const localNames: string[] = [];
  for (const element of name.elements) {
    if (element.dotDotDotToken || element.initializer || !ts.isIdentifier(element.name)) {
      return null;
    }
    const local = element.name.text;
    let imported = local;
    if (element.propertyName) {
      if (!ts.isIdentifier(element.propertyName)) {
        return null;
      }
      imported = element.propertyName.text;
    }
    if (imported === 'default') {
      return null;
    }
    bindings.push(imported === local ? local : `${imported} as ${local}`);
    localNames.push(local);
  }
  return { text: `import { ${bindings.join(', ')} } from ${quoted};`, localNames };
}

function isModuleExportsAssignment(statement: ts.Statement): statement is ts.ExpressionStatement & {
  expression: ts.BinaryExpression;
} {
  if (!ts.isExpressionStatement(statement) || !ts.isBinaryExpression(statement.expression)) {
    return false;
  }
  const { left, operatorToken } = statement.expression;
  return (
    operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(left) &&
    ts.isIdentifier(left.expression) &&
    left.expression.text === 'module' &&
    left.name.text === 'exports'
  );
}

/**
 * Names declared at the top level by `const`, function, or class
 * declarations. Only these can be exported with the same semantics as
 * `module.exports = {...}`, which snapshots values.
 */
function getConstTopLevelNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      names.add(statement.name.text);
    } else if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.flags & ts.NodeFlags.Const
    ) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.add(declaration.name.text);
        }
      }
    }
  }
  return names;
}

/**
 * Converts `module.exports = {a, b: c}` to `export {a, c as b}`, or returns
 * null if the object isn't a plain list of top-level constants.
 */
function convertModuleExports(
  statement: ts.ExpressionStatement & { expression: ts.BinaryExpression },
  exportableNames: Set<string>,
): string | null {
  const { right } = statement.expression;
  if (!ts.isObjectLiteralExpression(right)) {
    return null;
  }
  const specifiers: string[] = [];
  for (const property of right.properties) {
    let exported: string;
    let local: string;
    if (ts.isShorthandPropertyAssignment(property) && !property.objectAssignmentInitializer) {
      exported = local = property.name.text;
    } else if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      ts.isIdentifier(property.initializer)
    ) {
      exported = property.name.text;
      local = property.initializer.text;
    } else {
      return null;
    }
    if (!exportableNames.has(local) || exported === 'default') {
      return null;
    }
    specifiers.push(exported === local ? local : `${local} as ${exported}`);
  }
  return `export { ${specifiers.join(', ')} };`;
}

/**
 * Finds things that behave differently in an ES module than in a CommonJS
 * one: references to `module`, `exports`, or `arguments` outside a function,
 * and `this` outside a function or class.
 */
function findCommonJsOnlyReference(
  sourceFile: ts.SourceFile,
  ignore: ts.Node | undefined,
): string | null {
  let found: string | null = null;

  const visit = (node: ts.Node, inFunction: boolean, inThisScope: boolean) => {
    if (found || node === ignore) {
      return;
    }
    if (ts.isIdentifier(node) && ['module', 'exports'].includes(node.text)) {
      const { parent } = node;
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isMethodDeclaration(parent) && parent.name === node) ||
        (ts.isPropertyDeclaration(parent) && parent.name === node) ||
        (ts.isBindingElement(parent) && parent.propertyName === node);
      if (!isPropertyName) {
        found = `references \`${node.text}\``;
        return;
      }
    }
    if (ts.isIdentifier(node) && node.text === 'arguments' && !inFunction) {
      found = 'references top-level `arguments`';
      return;
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword && !inThisScope) {
      found = 'references top-level `this`';
      return;
    }

    const isFunction =
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node);
    const nextInFunction = inFunction || isFunction;
    const nextInThisScope = inThisScope || isFunction || ts.isClassLike(node);
    ts.forEachChild(node, (child) => visit(child, nextInFunction, nextInThisScope));
  };

  visit(sourceFile, false, false);
  return found;
}

function applyEdits(source: string, edits: Edit[]): string {
  let output = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Mechanically converts a CommonJS JavaScript module to a TypeScript ES
 * module:
 *
 * - drops a `'use strict'` directive (ES modules are always strict);
 * - converts the leading run of top-level `require` statements to
 *   `import`s, stopping at the first statement that isn't pure, so that
 *   hoisting the imports can't reorder side effects;
 * - converts a trailing `module.exports = {a, b}` to `export {a, b}`.
 *
 * It doesn't add types. It refuses (returns `ok: false`) when the file uses
 * CommonJS features that don't have a mechanical equivalent.
 */
export function convertToTypeScript(
  filePath: string,
  source: string,
  getModuleKind: GetModuleKind = defaultGetModuleKind,
): CodemodResult {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const parseDiagnostics = (sourceFile as unknown as { parseDiagnostics: ts.Diagnostic[] })
    .parseDiagnostics;
  if (parseDiagnostics.length > 0) {
    return { ok: false, reason: 'file does not parse' };
  }

  const { statements } = sourceFile;
  const lastStatement = statements.at(-1);
  const exportsStatement =
    lastStatement && isModuleExportsAssignment(lastStatement) ? lastStatement : undefined;

  const commonJsOnlyReference = findCommonJsOnlyReference(sourceFile, exportsStatement);
  if (commonJsOnlyReference) {
    return { ok: false, reason: commonJsOnlyReference };
  }

  const edits: Edit[] = [];
  const importedNames = new Set<string>();
  let hasModuleSyntax = false;

  let index = 0;
  const first = statements[0];
  if (
    first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === 'use strict'
  ) {
    const end = source.slice(first.end).match(/^[^\S\n]*\n?\s*/)![0].length + first.end;
    edits.push({ start: first.getStart(sourceFile), end, text: '' });
    index = 1;
  }

  for (; index < statements.length; index++) {
    const statement = statements[index];
    if (statement === exportsStatement) {
      break;
    }
    const converted = convertRequireStatement(sourceFile, statement, getModuleKind);
    if (converted) {
      edits.push({
        start: statement.getStart(sourceFile),
        end: statement.end,
        text: converted.text,
      });
      converted.localNames.forEach((name) => importedNames.add(name));
      hasModuleSyntax = true;
    } else if (!isPureStatement(statement)) {
      break;
    }
  }

  if (exportsStatement) {
    const exportableNames = getConstTopLevelNames(sourceFile);
    importedNames.forEach((name) => exportableNames.delete(name));
    const exportText = convertModuleExports(exportsStatement, exportableNames);
    if (exportText === null) {
      return { ok: false, reason: '`module.exports` is not a list of top-level constants' };
    }
    edits.push({
      start: exportsStatement.getStart(sourceFile),
      end: exportsStatement.end,
      text: exportText,
    });
    hasModuleSyntax = true;
  }

  let output = applyEdits(source, edits);
  if (!hasModuleSyntax) {
    // Without an import or export, TypeScript treats the file as a global
    // script, and its top-level declarations would clash with other files'.
    output = `${output.trimEnd()}\n\nexport {};\n`;
  }
  return { ok: true, output };
}
