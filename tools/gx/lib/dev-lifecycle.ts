import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SESSION_DIR = '.ghost-dev.sessions';
const sessionPrefix = (id: string) => `${createHash('sha256').update(id).digest('hex')}-`;

/** A unique marker for this stack, removed by its owning Codex session's SessionEnd hook. */
export function createCodexMarker(root: string, sessionId: string | undefined): string {
  if (!sessionId) {
    return '';
  }
  const dir = join(root, SESSION_DIR);
  mkdirSync(dir, { recursive: true });
  const marker = join(dir, `${sessionPrefix(sessionId)}${randomUUID()}`);
  writeFileSync(marker, '');
  return marker;
}

/** Hook input comes from stdin; never let another session remove this stack's marker. */
export function endCodexSession(root: string, input: unknown): void {
  if (
    !input ||
    typeof input !== 'object' ||
    !('session_id' in input) ||
    typeof input.session_id !== 'string' ||
    !input.session_id
  ) {
    return;
  }
  const dir = join(root, SESSION_DIR);
  if (!existsSync(dir)) {
    return;
  }
  const prefix = sessionPrefix(input.session_id);
  for (const file of readdirSync(dir)) {
    if (file.startsWith(prefix)) {
      rmSync(join(dir, file), { force: true });
    }
  }
}

// Invoke a script file so paths remain ordinary arguments rather than inputs to `sh -c`.
export const watchedDevScript = fileURLToPath(new URL('./dev-watch.sh', import.meta.url));
