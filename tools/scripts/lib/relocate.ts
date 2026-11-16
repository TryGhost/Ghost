import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Moves files and folders and keeps every relative import pointing at the same
 * file. A move changes two kinds of specifier: those written in a moved file,
 * and those anywhere else that point at one.
 *
 * It rewrites what can be read as a module specifier: `require()`, `import`,
 * `export … from`, `import()`, `typeof import()`, `require.resolve()` and
 * `mock()`-style calls. Paths built from strings (`path.join(__dirname, …)`)
 * are not specifiers and are reported for a hand edit instead.
 */

export interface Move {
  /** Repository-relative path of a file or folder, with forward slashes. */
  readonly from: string;
  readonly to: string;
}

const sourceFile = /\.(?:[cm]?[jt]s|tsx|jsx)$/;
// A relative specifier in any of the call or statement forms that take one.
const specifier =
  /(\b(?:require|import|mock|doMock|unmock|resolve|requireActual|importActual)\s*\(\s*|\bfrom\s+|^\s*import\s+)(['"`])(\.{1,2}(?:\/[^'"`\n]*)?)\2/gm;
// A relative path handed to a path helper: not a specifier, so not rewritten.
const stringPath =
  /\b(?:join|resolve)\(\s*(?:__dirname|import\.meta\.dirname)\s*,\s*(['"`])(\.{1,2}\/[^'"`\n]*)\1/g;

const posix = (file: string) => file.split(path.sep).join('/');

/** Where a path ends up after the moves, or the path itself when it does not move. */
export function relocated(file: string, moves: readonly Move[]): string {
  for (const { from, to } of moves) {
    if (file === from) {
      return to;
    }
    if (file.startsWith(`${from}/`)) {
      return `${to}${file.slice(from.length)}`;
    }
    // A specifier names a file without its extension, or a folder by its index.
    const stem = from.replace(sourceFile, '');
    if (stem !== from && file === stem) {
      return to.replace(sourceFile, '');
    }
    // Moving a folder's index file moves what a specifier naming the folder means.
    if (stem !== from && stem.endsWith('/index') && file === stem.slice(0, -'/index'.length)) {
      const moved = to.replace(sourceFile, '');
      return moved.endsWith('/index') ? moved.slice(0, -'/index'.length) : moved;
    }
  }
  return file;
}

/**
 * Rewrites the relative specifiers in one file's source.
 *
 * @param source - The file's contents.
 * @param file - Where the file is before the moves, relative to the repository.
 * @param moves - The moves being made.
 */
export function rewriteSpecifiers(source: string, file: string, moves: readonly Move[]): string {
  const before = path.posix.dirname(file);
  const after = path.posix.dirname(relocated(file, moves));
  return source.replace(specifier, (match, lead: string, quote: string, written: string) => {
    const target = path.posix.normalize(path.posix.join(before, written));
    const moved = relocated(target, moves);
    if (moved === target && after === before) {
      return match;
    }
    let rewritten = path.posix.relative(after, moved) || '.';
    if (!rewritten.startsWith('.')) {
      rewritten = `./${rewritten}`;
    }
    if (written.endsWith('/') && !rewritten.endsWith('/')) {
      rewritten += '/';
    }
    return `${lead}${quote}${rewritten}${quote}`;
  });
}

/** Relative paths passed to path helpers that the moves change. These need a hand edit. */
export function stringPathsNeedingEdits(source: string, file: string, moves: readonly Move[]) {
  const before = path.posix.dirname(file);
  const fileMoved = relocated(file, moves) !== file;
  const found: string[] = [];
  for (const match of source.matchAll(stringPath)) {
    const target = path.posix.normalize(path.posix.join(before, match[2]!));
    if (fileMoved || relocated(target, moves) !== target) {
      found.push(match[2]!);
    }
  }
  return found;
}

function sourceFiles(repository: string, roots: readonly string[]) {
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(path.join(repository, directory), { withFileTypes: true })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!['node_modules', 'built', 'build', 'dist', 'coverage', '.git'].includes(entry.name)) {
          walk(relative);
        }
      } else if (entry.isFile() && sourceFile.test(entry.name)) {
        files.push(relative);
      }
    }
  };
  for (const root of roots) {
    if (existsSync(path.join(repository, root))) {
      walk(root);
    }
  }
  return files;
}

export interface RelocateResult {
  /** Files whose specifiers were rewritten, by their path after the moves. */
  readonly rewritten: string[];
  /** Hand edits still needed: a file and the string paths in it that the moves change. */
  readonly manual: { file: string; paths: string[] }[];
}

/**
 * Moves each `from` to its `to` with `git mv`, then rewrites specifiers in every
 * source file under `roots`.
 */
export function relocate(
  repository: string,
  moves: readonly Move[],
  roots: readonly string[] = ['ghost', 'tools'],
): RelocateResult {
  for (const { from } of moves) {
    if (!existsSync(path.join(repository, from))) {
      throw new Error(`Nothing to move at ${from}.`);
    }
  }
  // Read everything first: specifiers are resolved against where files are now.
  const sources = sourceFiles(repository, roots).map((file) => ({
    file,
    source: readFileSync(path.join(repository, file), 'utf8'),
  }));

  for (const { from, to } of moves) {
    mkdirSync(path.dirname(path.join(repository, to)), { recursive: true });
    const moved = spawnSync('git', ['mv', from, to], { cwd: repository, encoding: 'utf8' });
    if (moved.status !== 0) {
      throw new Error(`git mv ${from} ${to} failed: ${moved.stderr.trim()}`);
    }
  }

  const result: RelocateResult = { rewritten: [], manual: [] };
  for (const { file, source } of sources) {
    const destination = relocated(file, moves);
    const rewritten = rewriteSpecifiers(source, file, moves);
    if (rewritten !== source) {
      writeFileSync(path.join(repository, destination), rewritten);
      result.rewritten.push(destination);
    }
    const paths = stringPathsNeedingEdits(source, file, moves);
    if (paths.length) {
      result.manual.push({ file: destination, paths });
    }
  }
  return result;
}

/**
 * Copies a folder to another place in another tree, rewriting specifiers as a
 * move would. Tests use it to lay fixture domains out as real ones.
 */
export function copyRelocated(
  sourceRepository: string,
  targetRepository: string,
  moves: readonly Move[],
) {
  for (const { from } of moves) {
    const walk = (relative: string) => {
      const absolute = path.join(sourceRepository, relative);
      if (statSync(absolute).isDirectory()) {
        for (const entry of readdirSync(absolute)) {
          walk(`${relative}/${entry}`);
        }
        return;
      }
      const destination = path.join(targetRepository, relocated(posix(relative), moves));
      mkdirSync(path.dirname(destination), { recursive: true });
      const source = readFileSync(absolute, 'utf8');
      writeFileSync(
        destination,
        sourceFile.test(relative) ? rewriteSpecifiers(source, posix(relative), moves) : source,
      );
    };
    walk(from);
  }
}
