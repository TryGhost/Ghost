// Moves files or folders and rewrites every relative import that the move changes.
//
// Usage: node tools/scripts/relocate.ts <from> <to> [<from> <to> ...]
//   Paths are relative to the repository root. Uses `git mv`, so run it on a
//   clean tree and review the diff.

import path from 'node:path';
import { relocate, type Move } from './lib/relocate.ts';

const paths = process.argv.slice(2);
if (paths.length === 0 || paths.length % 2 !== 0) {
  console.error('Usage: node tools/scripts/relocate.ts <from> <to> [<from> <to> ...]');
  process.exit(1);
}
const moves: Move[] = [];
for (let index = 0; index < paths.length; index += 2) {
  moves.push({ from: paths[index]!, to: paths[index + 1]! });
}

const { rewritten, manual } = relocate(path.resolve(import.meta.dirname, '../..'), moves);
console.log(`Moved ${moves.length} path(s); rewrote specifiers in ${rewritten.length} file(s).`);
for (const { file, paths: found } of manual) {
  console.log(`Edit by hand: ${file} builds ${found.join(', ')} from a string.`);
}
