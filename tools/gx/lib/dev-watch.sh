#!/bin/sh

# Runs inside the detached process group and records the tree each poll, as `treeTargets` does,
# so Nx tasks, which lead their own groups, still get dev:down's TERM/KILL after the leader exits.
# Arguments: checkout root, trusted package.json command, Claude PID, Codex session marker.
tree() {
  if [ -d /proc/self ]; then cat /proc/[0-9]*/stat; else ps -Ao pid=,ppid=,pgid=; fi 2>/dev/null |
    awk -v g=$$ '/\)/ { pid = $1; sub(/.*\) /, ""); $0 = pid " " $2 " " $3 }
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
done) & exec sh -c "$2"
