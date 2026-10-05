export type Language = 'javascript' | 'typescript';
export type Category = 'frontend' | 'backend' | 'tests' | 'tooling';
export interface Dependency {
  specifier: string;
  mode: 'import' | 'require';
}
export type DependencyStatus =
  | 'typed'
  | 'typed-builtin'
  | 'builtin-types-unavailable'
  | 'javascript'
  | 'json'
  | 'unresolved';
export interface ResolvedDependency extends Dependency {
  status: DependencyStatus;
  config: string | null;
  target?: string;
}
export interface SourceSignals {
  dynamicImports: number;
  functions: number;
  commonjs: boolean;
  parseErrors: number;
  lines: number;
}
export interface SourceFile extends SourceSignals {
  path: string;
  package: string;
  category: Category;
  language: Language;
  imports: ResolvedDependency[];
  dependents: string[];
  score: number;
  difficulty: 'easier' | 'moderate' | 'harder';
  signals: {
    javascriptDependencies: number;
    uncertainDependencies: number;
    dynamicImports: number;
    size: number;
    functions: number;
    commonjs: number;
    parseErrors: number;
  };
}
export interface Counts {
  javascript: number;
  typescript: number;
  javascriptLines: number;
  typescriptLines: number;
  typescriptPercent: number;
  typescriptLinePercent: number;
}
export interface Inventory {
  schemaVersion: 2;
  revision: string;
  scope: string;
  summary: Counts;
  groups: { package: Record<string, Counts>; category: Record<string, Counts> };
  declarations: number;
  excluded: string[];
  warnings: string[];
  files: SourceFile[];
}
export interface FileNode {
  name: string;
  path: string;
  language: Language;
}
export interface DirectoryNode {
  name: string;
  path: string;
  javascript: number;
  typescript: number;
  children: TreeNode[];
}
export type TreeNode = FileNode | DirectoryNode;
