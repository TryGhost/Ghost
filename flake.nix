{
  description = "Ghost development environment";

  # Prerequisites (not managed by this flake):
  #   - Nix with flakes enabled.
  #   - virtualisation.docker.enable = true; in your NixOS system
  #     configuration (one-time, system-level — a project flake can't manage this).

  # Usage:
  #   nix develop
  #   pnpm run setup (first time only)
  #   pnpm dev

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        nixHostGatewayOverride = pkgs.writeText "compose.dev.nix-host.yaml" ''
          services:
            ghost-dev:
              ports:
                - "23680:2368"
            ghost-dev-gateway:
              network_mode: host
              ports: !reset []
              volumes:
                - ./compose.dev.nix-host.Caddyfile:/etc/caddy/Caddyfile:ro
              environment:
                GHOST_BACKEND: localhost:23680
                ADMIN_DEV_SERVER: localhost:5174
                ADMIN_LIVE_RELOAD_SERVER: localhost:4200
                PORTAL_DEV_SERVER: localhost:4175
                COMMENTS_DEV_SERVER: localhost:7173
                SIGNUP_DEV_SERVER: localhost:6174
                SEARCH_DEV_SERVER: localhost:4178
                ANNOUNCEMENT_DEV_SERVER: localhost:4177
                ADMIN_TOOLBAR_DEV_SERVER: localhost:4176
                LEXICAL_DEV_SERVER: localhost:4173
                ANALYTICS_PROXY_TARGET: localhost:3000
                ACTIVITYPUB_PROXY_TARGET: localhost:8080
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          name = "ghost-dev";

          packages = [
            pkgs.nodejs_22
            pkgs.docker-client
          ];

          shellHook = ''
            # corepack can't symlink into the read-only /nix/store, so give it
            # a writable install directory for the pnpm shim instead.
            export COREPACK_HOME="$HOME/.cache/node/corepack"
            mkdir -p "$HOME/.local/share/ghost-corepack-shims"
            export PATH="$HOME/.local/share/ghost-corepack-shims:$PATH"
            if ! corepack enable --install-directory "$HOME/.local/share/ghost-corepack-shims" pnpm >/dev/null 2>&1; then
              echo "warning: corepack enable failed; pnpm shim may be missing from PATH." >&2
            fi

            if ! docker info >/dev/null 2>&1; then
              echo "warning: docker daemon not reachable." >&2
              echo "  On NixOS, enable it once at the system level:" >&2
              echo "    virtualisation.docker.enable = true;" >&2
              echo "  then add yourself to the docker group and re-login (or newgrp docker):" >&2
              echo "    users.users.<you>.extraGroups = [ \"docker\" ];" >&2
            fi

            ${pkgs.lib.optionalString pkgs.stdenv.isLinux ''
              # Regenerate the gitignored compose override every shell entry
              # so it always matches this flake.nix, then point pnpm dev's
              # ''${DEV_COMPOSE_FILES} extension hook (see package.json) at it.
              install -m644 ${nixHostGatewayOverride} ./compose.dev.nix-host.yaml

              # Caddy binds :80 in the tracked Caddyfile; under network_mode:
              # host that can't be remapped via compose ports, so derive a
              # :2368 copy from whatever Caddyfile is currently checked out
              # (keeps it from drifting out of sync with upstream changes)
              # and mount that over the container's config instead.
              sed 's/^:80 {/:2368 {/' docker/dev-gateway/Caddyfile > ./compose.dev.nix-host.Caddyfile
              if ! grep -q '^:2368 {' ./compose.dev.nix-host.Caddyfile; then
                echo "error: failed to rewrite docker/dev-gateway/Caddyfile's :80 listener to :2368" >&2
                echo "  (upstream Caddyfile format may have changed; update the sed pattern in flake.nix)" >&2
                exit 1
              fi

              export DEV_COMPOSE_FILES="-f compose.dev.nix-host.yaml ''${DEV_COMPOSE_FILES:-}"
            ''}
          '';
        };
      });
}
