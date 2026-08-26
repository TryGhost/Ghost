import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

export const MAX_AGENT_GUIDANCE_LINES = 150;

export async function listTrackedAgentGuidance(rootDirectory) {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z', ':(glob)**/AGENTS.md'], {
    cwd: rootDirectory,
    encoding: 'utf8',
  });

  return stdout.split('\0').filter(Boolean);
}

export function countLines(content) {
  if (content.length === 0) {
    return 0;
  }

  const lineBreaks = content.match(/\r\n|\r|\n/g)?.length ?? 0;
  const endsWithLineBreak = /(?:\r\n|\r|\n)$/.test(content);
  return lineBreaks + (endsWithLineBreak ? 0 : 1);
}

export async function checkAgentGuidance(rootDirectory, maxLines = MAX_AGENT_GUIDANCE_LINES) {
  const files = await listTrackedAgentGuidance(rootDirectory);
  const errors = [];

  for (const file of files) {
    const content = await readFile(path.join(rootDirectory, file), 'utf8');
    const lines = countLines(content);

    if (lines > maxLines) {
      errors.push(`${file} has ${lines} lines (maximum ${maxLines})`);
    }
  }

  return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const errors = await checkAgentGuidance(process.cwd());

  if (errors.length > 0) {
    console.error(`Agent guidance check failed:\n\n${errors.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log(`All tracked AGENTS.md files are within ${MAX_AGENT_GUIDANCE_LINES} lines.`);
  }
}
