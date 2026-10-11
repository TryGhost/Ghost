import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

// Runs inside the detached process group. Keep watching even if the leader exits, so its
// surviving children receive the same TERM/KILL shutdown as `dev:down`. Nx tasks lead their own
// process groups, so each poll records what to signal in the tree, as `treeTargets` does.
export const watchedDevCommand = `tree() {
  if [ -d /proc/self ]; then cat /proc/[0-9]*/stat; else ps -Ao pid=,ppid=,pgid=; fi 2>/dev/null |
    awk -v g=$$ '/\\)/ { pid = $1; sub(/.*\\) /, ""); $0 = pid " " $2 " " $3 }
      { ppid[$1] = $2; pgid[$1] = $3 }
      END { t[g]; do { n = 0; for (p in ppid) if (!(p in t) && (ppid[p] in t || pgid[p] in t)) { t[p]; n++ } } while (n)
        for (p in t) if (p in ppid) { x = (pgid[p] in t) ? -pgid[p] : p; if (x != -g && !(x in s)) { s[x]; print x } } }'
}
(while sleep 5; do
  if [ ! -e "$1/.git" ]; then echo "Stopping Ghost dev: $1 was deleted"
  elif [ -n "$3" ] && ! kill -0 "$3" 2>/dev/null; then echo "Stopping Ghost dev: Claude Code (pid $3) exited"
  elif [ -n "$4" ] && [ ! -e "$4" ]; then echo "Stopping Ghost dev: Codex session ended"
  elif ! kill -0 $$ 2>/dev/null; then echo "Stopping Ghost dev: process group leader exited"
  else stack=$(tree); continue; fi
  [ -z "$4" ] || rm -f "$4"
  rm -f "$1/.ghost-dev.pid"
  trap '' TERM; stack="$stack $(tree)"
  kill -s TERM -- $stack 0 2>/dev/null; sleep 10; kill -s KILL -- $stack 0 2>/dev/null
done) & exec sh -c "$2"`;
