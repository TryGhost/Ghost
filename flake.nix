{
  description = "Ghost development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  nixConfig = {
    extra-substituters = [ "https://hello-stocha.cachix.org" ];
    extra-trusted-public-keys = [
      "hello-stocha.cachix.org-1:vGouZviB0/Bl/TQW72IaHiIQ65jDFCSNjvKmpb6/oP8="
    ];
  };

  outputs =
    {
      self,
      nixpkgs,
      treefmt-nix,
      ...
    }:
    let
      systems = [
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-linux"
        # "x86_64-darwin" # no need to support intel macs
      ];

      eachSystem =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          let
            pkgs = import nixpkgs {
              inherit system;
              overlays = [ ];
            };
          in
          f pkgs
        );

      treefmtEval = eachSystem (pkgs: treefmt-nix.lib.evalModule pkgs .nix/treefmt.nix);
    in
    {
      formatter = eachSystem (pkgs: treefmtEval.${pkgs.stdenv.hostPlatform.system}.config.build.wrapper);

      checks = eachSystem (pkgs: {
        formatting = treefmtEval.${pkgs.stdenv.hostPlatform.system}.config.build.check self;
      });

      apps = eachSystem (pkgs: {
        precache-package =
          let
            app = import ./.nix/precache-package { inherit pkgs; };
          in
          {
            type = "app";
            program = toString (app + "/bin/precache-package");
          };
      });

      packages = eachSystem (
        pkgs:
        let
          # Source derivation - filters out Nix infrastructure files
          # Only includes Ghost application source that affects Docker builds
          source = pkgs.stdenv.mkDerivation {
            name = "ghost-source";
            src = pkgs.lib.sources.cleanSourceWith {
              src = self;
              filter = path: type:
                let
                  baseName = baseNameOf path;
                  relPath = pkgs.lib.removePrefix (toString self + "/") (toString path);
                in
                # Exclude Nix infrastructure, CI orchestration, and documentation
                baseName != "flake.nix" &&
                baseName != "flake.lock" &&
                baseName != "compose.yml" &&
                baseName != ".editorconfig" &&
                !(pkgs.lib.hasPrefix ".nix/" relPath) &&
                !(pkgs.lib.hasPrefix ".github/" relPath) &&
                !(pkgs.lib.hasPrefix ".vscode/" relPath) &&
                !(pkgs.lib.hasPrefix ".cursor/" relPath) &&
                !(pkgs.lib.hasPrefix ".claude/" relPath) &&
                !(pkgs.lib.hasPrefix "docs/" relPath) &&
                !(pkgs.lib.hasPrefix "adr/" relPath) &&
                !(pkgs.lib.hasSuffix ".md" baseName) &&
                # Use default clean filter for everything else (handles .git, caches, build outputs)
                (pkgs.lib.sources.cleanSourceFilter path type);
            };
            phases = [
              "unpackPhase"
              "installPhase"
            ];
            installPhase = ''
              cp -r . $out
            '';
          };

          dockerBuilds =
            if pkgs.stdenv.isLinux then
              import ./.docker-nix {
                inherit pkgs;
                inherit (pkgs) lib;
                src = source;
              }
            else
              null;
        in
        {
          # Export source so it can be built independently
          inherit source;

          dev = pkgs.writeShellApplication {
            name = "dev";
            runtimeInputs = [ pkgs.process-compose ];
            text = ''
              exec process-compose -f ./.nix/process-compose.yaml up "$@"
            '';
          };
        }
        // (
          if pkgs.stdenv.isLinux then
            {
              # Docker image and individual builders for faster iteration
              dockerImage = dockerBuilds.dockerImage;
              shade-builder = dockerBuilds.shade-builder;
              development-base = dockerBuilds.development-base;
              ghost-app = dockerBuilds.ghost-app;
            }
          else
            { }
        )
      );

      devShells = eachSystem (pkgs: {
        default = import ./.nix/dev-shell.nix { inherit pkgs; };
      });
    };
}
