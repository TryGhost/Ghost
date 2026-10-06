import type {
  Inventory,
  DirectoryNode,
  TreeNode,
  SourceFile,
} from './typescript-inventory-types.ts';
const report: Inventory & { tree: DirectoryNode } = JSON.parse(
  document.getElementById('data')!.textContent!,
);
function el(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error('Missing element ' + id);
  }
  return element;
}
const number = (value: number) => value.toLocaleString();
function inputValue(id: string): string {
  const element = el(id);
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
    return element.value;
  }
  throw new Error('Expected input ' + id);
}
function disable(id: string, disabled: boolean) {
  const element = el(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error('Expected button ' + id);
  }
  element.disabled = disabled;
}
function cell(row: HTMLTableRowElement, value: string | number) {
  const td = document.createElement('td');
  td.textContent = String(value);
  row.append(td);
  return td;
}
el('revision').textContent = report.revision.slice(0, 10);
el('scope').textContent = report.scope || 'Whole repository';
for (const [title, value] of [
  ['TypeScript files', report.summary.typescriptPercent + '%'],
  ['JavaScript files remaining', number(report.summary.javascript)],
  ['JavaScript lines remaining', number(report.summary.javascriptLines)],
  ['TypeScript by lines', report.summary.typescriptLinePercent + '%'],
] as const) {
  const box = document.createElement('div');
  box.className = 'card';
  const strong = document.createElement('strong');
  strong.textContent = value;
  box.append(strong, document.createTextNode(title));
  el('cards').append(box);
}
el('warnings').textContent =
  report.declarations +
  ' declaration files; ' +
  report.excluded.length +
  ' excluded source files (repository-wide).\n' +
  (report.warnings.join('\n') || 'No configuration warnings.') +
  '\nExcluded paths:\n' +
  report.excluded.join('\n');
for (const [name, stats] of Object.entries(report.groups.package)) {
  const row = document.createElement('tr');
  for (const value of [
    name,
    number(stats.javascript),
    number(stats.typescript),
    stats.typescriptPercent + '%',
    stats.typescriptLinePercent + '%',
  ]) {
    cell(row, value);
  }
  el('packages').append(row);
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  el('package').append(option);
}
for (const [name, stats] of Object.entries(report.groups.category)) {
  const row = document.createElement('tr');
  for (const value of [
    name,
    number(stats.javascript),
    number(stats.typescript),
    stats.typescriptPercent + '%',
    stats.typescriptLinePercent + '%',
  ]) {
    cell(row, value);
  }
  el('kinds').append(row);
}
const filesByPath = new Map(report.files.map((file) => [file.path, file]));
function treeEntry(node: TreeNode): HTMLLIElement {
  const item = document.createElement('li');
  if ('children' in node) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name + '/';
    const counts = document.createElement('span');
    counts.className = 'tree-count';
    counts.textContent = number(node.javascript) + ' JS · ' + number(node.typescript) + ' TS';
    summary.append(name, counts);
    details.append(summary);
    let populated = false;
    details.addEventListener('toggle', () => {
      if (details.open && !populated) {
        const list = document.createElement('ul');
        for (const child of node.children) {
          list.append(treeEntry(child));
        }
        details.append(list);
        populated = true;
      }
    });
    item.append(details);
  } else {
    const button = document.createElement('button');
    button.textContent = node.name;
    button.title = node.path;
    const language = document.createElement('span');
    language.className = 'tree-count';
    language.textContent = node.language === 'typescript' ? 'TS' : 'JS';
    button.append(language);
    button.onclick = () => inspect(filesByPath.get(node.path)!);
    item.append(button);
  }
  return item;
}
for (const node of report.tree.children) {
  el('file-tree').append(treeEntry(node));
}
let page = 0;
function inspect(file: SourceFile) {
  const detail = el('detail');
  detail.hidden = false;
  detail.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = file.path;
  const p = document.createElement('p');
  p.textContent =
    'Score ' +
    file.score +
    ' · ' +
    file.functions +
    ' functions · ' +
    file.dynamicImports +
    ' computed imports · ' +
    file.parseErrors +
    ' parse errors' +
    (file.commonjs ? ' · CommonJS' : '');
  detail.append(h, p);
  const pre = document.createElement('pre');
  pre.textContent =
    file.imports
      .map(
        (item) =>
          item.specifier +
          ' [' +
          item.mode +
          '] → ' +
          item.status +
          (item.target ? '\n  ' + item.target : '') +
          '\n  Config: ' +
          (item.config || 'NodeNext defaults'),
      )
      .join('\n\n') +
    '\n\nDependents:\n' +
    (file.dependents.join('\n') || 'None found');
  detail.append(pre);
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function render() {
  const query = inputValue('search').toLowerCase();
  const selected = report.files.filter(
    (f) =>
      f.language === 'javascript' &&
      (!inputValue('package') || f.package === inputValue('package')) &&
      (!inputValue('category') || f.category === inputValue('category')) &&
      (f.path + ' ' + f.package).toLowerCase().includes(query),
  );
  const sorts: Record<string, (a: SourceFile, b: SourceFile) => number> = {
    easy: (a, b) => a.score - b.score,
    hard: (a, b) => b.score - a.score,
    impact: (a, b) => b.dependents.length - a.dependents.length,
    lines: (a, b) => b.lines - a.lines,
  };
  selected.sort((a, b) => sorts[inputValue('sort')]!(a, b) || a.path.localeCompare(b.path));
  const pages = Math.max(1, Math.ceil(selected.length / 100));
  page = Math.min(page, pages - 1);
  el('count').textContent = number(selected.length) + ' matching JavaScript files';
  el('page').textContent = page + 1 + ' / ' + pages;
  disable('previous', page === 0);
  disable('next', page === pages - 1);
  el('candidates').replaceChildren();
  for (const f of selected.slice(page * 100, (page + 1) * 100)) {
    const row = document.createElement('tr');
    const button = document.createElement('button');
    button.textContent = f.path;
    button.onclick = () => inspect(f);
    cell(row, '').append(button);
    for (const value of [
      f.difficulty + ' · ' + f.score,
      number(f.lines),
      f.imports.filter((i) => i.status === 'typed' || i.status === 'typed-builtin').length,
      f.signals.javascriptDependencies,
      f.signals.uncertainDependencies + f.dynamicImports,
      f.dependents.length,
    ]) {
      cell(row, value);
    }
    el('candidates').append(row);
  }
}
for (const id of ['search', 'package', 'category', 'sort']) {
  el(id).addEventListener('input', () => {
    page = 0;
    el('detail').hidden = true;
    render();
  });
}
el('previous').onclick = () => {
  page -= 1;
  render();
};
el('next').onclick = () => {
  page += 1;
  render();
};
render();
