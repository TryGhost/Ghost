#!/bin/sh
set -e

# POSIX sh, not bash: avoids an Alpine bash package just for "[[ ... ]]"
case "$*" in
	node*index.js*) isGhost=1 ;;
	*) isGhost= ;;
esac

# ghost:6 installed to /var/lib/ghost; this image uses /home/ghost. An old -v target would boot an
# empty site while the real content sat unread, so: content there is fatal, an empty mount warns.
OLD_INSTALL='/var/lib/ghost'
OLD_CONTENT="$OLD_INSTALL/content"

_is_mountpoint() {
	# BusyBox "mountpoint" compares only dev/ino, so it misses bind mounts -- i.e. nearly every
	# Docker volume, and exactly what is being looked for here. Fall back to the mount table.
	# https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh
	mountpoint -q "$1" 2>/dev/null \
	|| awk -v dir="$1" '$5 == dir { found = 1 } END { exit !found }' /proc/self/mountinfo 2>/dev/null
}

_has_ghost_content() {
	[ -d "$1" ] || return 1
	# any of these means a real site, not the empty dir Docker creates for a mount
	for marker in "$1"/data/*.db "$1"/settings/routes.yaml "$1"/images/* "$1"/themes/*; do
		if [ -e "$marker" ]; then
			return 0
		fi
	done
	return 1
}

# the root pass below re-execs through gosu, so a marker keeps these from printing twice
if [ -n "$isGhost" ] && [ -z "${GHOST_OLD_PATH_CHECKED:-}" ]; then
	export GHOST_OLD_PATH_CHECKED=1

	if _has_ghost_content "$OLD_CONTENT" || [ -e "$OLD_INSTALL/.ghost-cli" ]; then
		cat >&2 <<-EOE
			Error: found existing Ghost content at $OLD_CONTENT, but this image stores
			       Ghost in /home/ghost.

			       ghost:6 and earlier installed to /var/lib/ghost. This tag moves that to
			       /home/ghost, so the content mounted at the old path is not being read.
			       Starting would create an empty site and leave that content untouched, so
			       this container will not start.

			       Point the mount at the new location instead:

			           -v ghost_content:/home/ghost/content

			       rather than:

			           -v ghost_content:$OLD_CONTENT

			       Nothing at $OLD_INSTALL has been modified.
		EOE
		exit 1
	fi

	oldMount=
	if _is_mountpoint "$OLD_CONTENT"; then
		oldMount="$OLD_CONTENT"
	elif _is_mountpoint "$OLD_INSTALL"; then
		oldMount="$OLD_INSTALL"
	fi
	if [ -n "$oldMount" ]; then
		cat >&2 <<-EOW
			Warning: something is mounted at $oldMount, but this image stores Ghost in
			         /home/ghost, so that mount is unused.

			         It looks empty, so this is most likely a stale -v left over from ghost:6.
			         Move it to /home/ghost/content.
		EOW
	fi
fi

# allow the container to be started with `--user`
if [ -n "$isGhost" ] && [ "$(id -u)" = '0' ]; then
	# -h: ghost:6 seeded its bundled themes as symlinks into /var/lib/ghost, which does not
	# exist here. Without it chown follows them, fails on the missing target, and set -e aborts.
	find "$GHOST_CONTENT" \! -user ghost -exec chown -h ghost '{}' +
	exec gosu ghost "$0" "$@"
fi

if [ -n "$isGhost" ]; then
	baseDir="$GHOST_INSTALL/content.orig"
	for src in "$baseDir"/*/ "$baseDir"/themes/*; do
		src="${src%/}"
		target="$GHOST_CONTENT/${src#$baseDir/}"
		mkdir -p "$(dirname "$target")"
		# those same dangling theme symlinks are not "-e", so the seed below would run and tar
		# would extract *through* the symlink instead of replacing it. Drop them first. Guarded on
		# broken-only so a user's own valid symlinked theme is left alone.
		if [ -L "$target" ] && [ ! -e "$target" ]; then
			rm -f "$target"
		fi
		if [ ! -e "$target" ]; then
			tar -cC "$(dirname "$src")" "$(basename "$src")" | tar -xC "$(dirname "$target")"
		fi
	done
fi

exec "$@"
