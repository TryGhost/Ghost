import { builtinModules } from 'node:module';
import { nodeLibConfig, noTopLevelAwaitRule } from '@internal/cfg-eslint';

// The kernel holds no state and reads nothing: any code may import and call
// it, so a file here must be safe to load any number of times, anywhere. The
// rules below are what a linter can check of that. See the README for what
// they cannot.

const topLevel = ':matches(Program, Program > ExportNamedDeclaration)';

const pureModuleSyntax = [
  {
    selector:
      'Program > :not(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ExportDefaultDeclaration, FunctionDeclaration, ClassDeclaration, TSTypeAliasDeclaration, TSInterfaceDeclaration, TSDeclareFunction, VariableDeclaration)',
    message:
      'Nothing runs when a kernel module is imported. The top level holds imports, types, functions and classes only.',
  },
  {
    selector: `${topLevel} > VariableDeclaration[kind!='const']`,
    message: 'A kernel module holds no state. A top-level binding must be a const.',
  },
  {
    selector: `${topLevel} > VariableDeclaration > VariableDeclarator:not([init.type='Literal'])`,
    message:
      'A kernel module builds nothing on import and exports no instances. A top-level const must be a string, number, boolean or null literal; build anything else inside a function the caller calls.',
  },
  {
    selector: `${topLevel} > VariableDeclaration > VariableDeclarator[init.regex]`,
    message:
      'A regular expression object holds state (lastIndex). Create it inside the function that uses it.',
  },
  {
    selector:
      'Program > ExportDefaultDeclaration > :not(FunctionDeclaration, ClassDeclaration, TSDeclareFunction)',
    message: 'A kernel module exports no instances. Export a function, a class or a type.',
  },
  {
    selector: ':matches(PropertyDefinition, AccessorProperty)[static=true], StaticBlock',
    message: 'A static class member is module state, which the kernel does not hold.',
  },
  {
    selector:
      "NewExpression[callee.name='Date'][arguments.length=0], CallExpression[callee.name='Date'], MemberExpression[object.name='Date'][property.name='now'], MemberExpression[object.name='Temporal'][property.name='Now']",
    message:
      "The kernel does not read the time. Take a time as an argument; the foundation's clock supplies it.",
  },
  {
    selector: 'ImportExpression',
    message: 'A kernel module loads nothing while it runs. Import at the top of the file.',
  },
];

const reads = (name) => ({
  name,
  message:
    'The kernel reads no files, environment, network or process state. Take the value as an argument.',
});

// Packages that export an instance. Their types may be imported.
const instancePackages = ['@tryghost/logging', 'knex'].map((name) => ({
  name,
  allowTypeImports: true,
  message:
    'This package holds an instance. The kernel may import its types; the foundry builds the instance.',
}));

export default nodeLibConfig({
  testGlobs: false,
  extraSrcRules: {
    // The posture these files had under ghost/eslint.config.mjs: TypeScript
    // overloads, and `any` where an adapter or a legacy module is untyped.
    '@typescript-eslint/no-explicit-any': 'off',
    'no-redeclare': 'off',

    'no-restricted-syntax': [...noTopLevelAwaitRule['no-restricted-syntax'], ...pureModuleSyntax],
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          ...builtinModules.flatMap((name) => [reads(name), reads(`node:${name}`)]),
          ...instancePackages,
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      ...[
        'process',
        'require',
        'module',
        '__dirname',
        '__filename',
        'globalThis',
        'global',
        'performance',
        'fetch',
      ].map(reads),
    ],
  },
});
