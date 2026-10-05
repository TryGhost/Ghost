import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type {
  Inventory,
  Language,
  FileNode,
  DirectoryNode,
  TreeNode,
} from './typescript-inventory-types.ts';
export function buildFileTree(files: { path: string; language: Language }[]): DirectoryNode {
  interface Directory {
    name: string;
    path: string;
    javascript: number;
    typescript: number;
    children: Map<string, Directory | FileNode>;
  }
  const root: Directory = { name: '', path: '', javascript: 0, typescript: 0, children: new Map() };
  for (const file of files) {
    const parts = file.path.split('/');
    let directory = root;
    for (let index = 0; index < parts.length; index += 1) {
      directory.javascript += Number(file.language === 'javascript');
      directory.typescript += Number(file.language === 'typescript');
      const name = parts[index]!;
      if (index === parts.length - 1) {
        directory.children.set(name, { name, path: file.path, language: file.language });
      } else {
        if (!directory.children.has(name)) {
          directory.children.set(name, {
            name,
            path: parts.slice(0, index + 1).join('/'),
            javascript: 0,
            typescript: 0,
            children: new Map(),
          });
        }
        const child = directory.children.get(name)!;
        if (!('children' in child)) {
          throw new Error('File conflicts with directory');
        }
        directory = child;
      }
    }
  }
  function serialize(node: Directory | FileNode): TreeNode {
    if (!('children' in node)) {
      return node;
    }
    return {
      ...node,
      children: [...node.children.values()]
        .sort(
          (a, b) =>
            Number('children' in b) - Number('children' in a) || a.name.localeCompare(b.name),
        )
        .map(serialize),
    };
  }
  return {
    ...root,
    children: [...root.children.values()]
      .sort(
        (a, b) => Number('children' in b) - Number('children' in a) || a.name.localeCompare(b.name),
      )
      .map(serialize),
  };
}

export function renderInventory(report: Inventory) {
  const data = JSON.stringify({ ...report, tree: buildFileTree(report.files) }).replaceAll(
    '<',
    '\\u003c',
  );
  const browserScript = ts
    .transpileModule(
      readFileSync(new URL('./typescript-inventory-browser.ts', import.meta.url), 'utf8'),
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
    )
    .outputText.replace(/^export \{\};?$/m, '');
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ghost · TypeScript inventory</title>
<style>
:root{font:15px system-ui;color:#18232e;background:#f5f7f9}body{max-width:1500px;margin:auto;padding:40px}h1{font-size:36px;letter-spacing:-1px;margin:8px 0}h2{margin-top:32px}p{line-height:1.6;color:#536372}header small{letter-spacing:2px}section{display:flex;gap:16px;flex-wrap:wrap}.card{background:white;border:1px solid #dae1e7;border-radius:12px;padding:22px;flex:1}.card strong{display:block;font-size:32px}.controls{display:flex;gap:16px;align-items:end;flex-wrap:wrap;margin:24px 0}label{display:grid;gap:6px}input,select,button{padding:10px;border:1px solid #b8c5cf;border-radius:6px;background:white;color:inherit;font:inherit}input{min-width:280px}table{border-collapse:collapse;width:100%;background:white;font-size:13px}th,td{text-align:left;padding:12px;border-bottom:1px solid #e0e6eb;vertical-align:top}th{background:#eaf0f4}td:first-child{overflow-wrap:anywhere}summary{cursor:pointer}.scroll{overflow:auto;max-height:480px}th{position:sticky;top:0}.muted{color:#657584}.badge{border-radius:20px;padding:3px 8px;background:#edf2f5;white-space:nowrap}pre{white-space:pre-wrap;overflow-wrap:anywhere}progress{width:100%;accent-color:#138575}button{cursor:pointer}#detail{background:white;padding:20px;border-radius:12px;margin-top:16px}a{color:#136c87}
.file-tree{background:white;border:1px solid #dae1e7;border-radius:12px;padding:16px;max-height:650px;overflow:auto}.file-tree ul{list-style:none;margin:0;padding-left:24px}.file-tree>ul{padding-left:0}.file-tree summary{padding:9px 4px;border-radius:5px}.file-tree summary:hover,.file-tree button:hover{background:#f0f5f7}.file-tree button{border:0;background:transparent;padding:9px 4px;font-size:14px;text-align:left;overflow-wrap:anywhere}.tree-count{font-size:12px;color:#536372;margin-left:14px;white-space:nowrap}.tree-name{font-weight:600}.file-tree details>ul{border-left:1px solid #e0e6eb;margin-left:8px}.file-tree summary:focus-visible,.file-tree button:focus-visible{outline:2px solid #138575}
</style>
<header><small>GHOST / CODEBASE HEALTH</small><h1>The path to TypeScript</h1><p>Tracked working-tree source • <span id="revision"></span> • <span id="scope"></span></p></header>
<section id="cards"></section>
<p>Counts include comments and blank lines. Declarations, fixtures, vendor and build directories are separate; submodules are excluded. TypeScript file extensions measure migration progress, not type safety.</p>
<details><summary>How difficulty is estimated</summary><p>Each unique import per import/require mode: JavaScript +3, unresolved or unavailable Node types +5. Computed imports +5 each; each 100 lines +1; each 5 functions +1; CommonJS +2; each parse error +10. Scores ≤5 are easier, ≤15 moderate, otherwise harder. Dependents indicate impact and are not added to difficulty. Types are resolved using the nearest tracked tsconfig.json, or NodeNext defaults. Missing declarations may need a build or dependency install. Ambient declarations, bundler plugins, JSDoc quality and runtime complexity are not assessed. Manually inspect candidates before choosing work.</p></details>
<details><summary>Inventory coverage and warnings</summary><pre id="warnings"></pre></details>
<h2>Progress by kind</h2><p>Frontend: browser apps, Koenig editor UI and Core public browser scripts. Backend: server code and library packages, including libraries shared with the frontend. Tests and tooling stay separate. Classification follows paths, not runtime analysis.</p><div class="scroll"><table><thead><tr><th>Kind</th><th>JavaScript remaining</th><th>TypeScript files</th><th>TypeScript by files</th><th>TypeScript by lines</th></tr></thead><tbody id="kinds"></tbody></table></div>
<h2>Browse folders</h2><p>Expand a folder to see its contents. JS and TS totals include every nested folder. Select a file to inspect its dependencies.</p><nav class="file-tree" aria-label="Source file inventory"><ul id="file-tree"></ul></nav>
<h2>Progress by package</h2><div class="scroll"><table><thead><tr><th>Package</th><th>JavaScript remaining</th><th>TypeScript files</th><th>TypeScript by files</th><th>TypeScript by lines</th></tr></thead><tbody id="packages"></tbody></table></div>
<h2>Conversion candidates</h2>
<div class="controls"><label>Find a file<input id="search" type="search" placeholder="Path or package name"></label><label>Area<select id="package"><option value="">All packages</option></select></label><label>Kind<select id="category"><option value="">All code</option><option value="frontend">Frontend</option><option value="backend">Backend</option><option value="tests">Tests</option><option value="tooling">Tooling</option></select></label><label>Order<select id="sort"><option value="easy">Easier first</option><option value="hard">Harder first</option><option value="impact">Most dependents</option><option value="lines">Largest files</option></select></label></div>
<p id="count"></p><div class="scroll"><table><thead><tr><th>File · inspect dependencies</th><th>Difficulty</th><th>Lines</th><th>Typed imports</th><th>JS imports</th><th>Unknown imports</th><th>Dependents</th></tr></thead><tbody id="candidates"></tbody></table></div>
<p><button id="previous">Previous</button> <span id="page"></span> <button id="next">Next</button></p><div id="detail" hidden></div>
<script type="application/json" id="data">${data}</script>
<script>
${browserScript}
</script></html>`;
}
