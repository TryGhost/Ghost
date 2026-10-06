import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';

async function main() {
  const { values } = parseArgs({ options: { checkout: { type: 'string' } } });
  if (!values.checkout) {
    throw new Error('--checkout PATH to an existing TryGhost/ghst checkout is required');
  }
  const checkout = resolve(values.checkout);
  const packageJson = JSON.parse(await readFile(checkout + '/package.json', 'utf8')) as {
    name: string;
  };
  if (packageJson.name !== '@tryghost/ghst') {
    throw new Error('Expected a GHST source checkout');
  }
  await copyFile(
    new URL('../ghst/canvas.ts', import.meta.url),
    checkout + '/src/commands/canvas.ts',
  );
  await copyFile(
    new URL('../ghst/canvas.test.ts', import.meta.url),
    checkout + '/tests/canvas.test.ts',
  );
  await copyFile(
    new URL('../ghst/canvas-actions.ts', import.meta.url),
    checkout + '/src/lib/canvas-actions.ts',
  );
  for (const [source, target] of [
    ['agent-client', 'canvas-client'],
    ['protocol', 'canvas-protocol'],
  ]) {
    const content = await readFile(new URL(`../src/${source}.ts`, import.meta.url), 'utf8');
    await writeFile(
      checkout + `/src/lib/${target}.ts`,
      content.replaceAll('./protocol.ts', './canvas-protocol.js'),
    );
  }
  const entryPath = checkout + '/src/index.ts';
  let entry = await readFile(entryPath, 'utf8');
  if (!entry.includes('registerCanvasCommands')) {
    entry = "import {registerCanvasCommands} from './commands/canvas.js';\n" + entry;
    entry = entry.replace(
      '  registerThemeCommands(program);',
      '  registerThemeCommands(program);\n  registerCanvasCommands(program);',
    );
    await writeFile(entryPath, entry);
  }
  const readmePath = checkout + '/README.md';
  const readme = await readFile(readmePath, 'utf8');
  const canvasDocs = await readFile(new URL('../ghst/README.md', import.meta.url), 'utf8');
  const previousDocs = readme.indexOf('## Canvas relay local extension');
  await writeFile(
    readmePath,
    (previousDocs < 0 ? readme : readme.slice(0, previousDocs)).trimEnd() + '\n\n' + canvasDocs,
  );
  const guidancePath = checkout + '/AGENTS.md';
  const guidance = await readFile(guidancePath, 'utf8');
  if (!guidance.includes('ghst canvas connect')) {
    await writeFile(
      guidancePath,
      guidance.replace(
        '## Implemented Commands',
        '## Implemented Commands\n\n- `ghst canvas connect|wait|status|tools|state|read|edit|inspect|content|history|reveal|review|result|disconnect` (local extension; see README).',
      ),
    );
  }
  console.log(
    JSON.stringify({
      status: 'installed',
      checkout,
      message: 'Build this local GHST checkout. No upstream files are published.',
    }),
  );
}
void main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
