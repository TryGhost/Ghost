# Nix expression for building Ghost Docker images
#
# Multi-stage build mirroring .docker/Dockerfile with key differences:
# - Native modules (sqlite3, sharp, re2) compiled from source against Nix libraries
# - Shebangs in node_modules patched to use Nix store paths (required for sandbox)
# - System files (/etc/passwd, /tmp) created explicitly (no base image provides them)
# - Environment variables set to enable Nx daemon and bind Ghost to 0.0.0.0 in containers
{
  pkgs,
  lib,
  src,
}:

let
  nodejs = pkgs.nodejs_22;

  # Python 3.12 with setuptools for node-gyp (which requires distutils)
  pythonWithSetuptools = pkgs.python312.withPackages (ps: [ ps.setuptools ]);

  etcFiles = pkgs.runCommand "docker-etc-files" { } ''
    mkdir -p $out/etc
    cp ${./etc/passwd} $out/etc/passwd
    cp ${./etc/group} $out/etc/group
    cp ${./etc/nsswitch.conf} $out/etc/nsswitch.conf
  '';

  commonEnv = {
    PYTHON = "${pythonWithSetuptools}/bin/python3";
    npm_config_python = "${pythonWithSetuptools}/bin/python3";
    GYP_PYTHON = "${pythonWithSetuptools}/bin/python3";
    npm_config_sharp_libvips_lib_dir = "${pkgs.vips}/lib";
    npm_config_sharp_libvips_include_dir = "${pkgs.vips}/include";
    PKG_CONFIG_PATH = "${pkgs.vips}/lib/pkgconfig";
    npm_config_build_from_source = "true";
    npm_config_sqlite3_binary_host = "";
    LD_LIBRARY_PATH = lib.makeLibraryPath [
      pkgs.vips
      pkgs.sqlite
      pkgs.stdenv.cc.cc.lib
    ];
  };

  nativeBuildInputs = with pkgs; [
    bash
    coreutils
    nodejs
    yarn
    pkg-config
    pythonWithSetuptools
    stdenv.cc
    gnumake
    git
    nodePackages.patch-package
    husky
  ];

  buildInputs = with pkgs; [
    vips
    sqlite
    libpng
    libjpeg
    libwebp
    giflib
    librsvg
  ];

  # Common attributes for all build derivations
  commonBuildAttrs = {
    inherit nativeBuildInputs buildInputs;
    inherit (commonEnv)
      PYTHON
      npm_config_python
      GYP_PYTHON
      npm_config_sharp_libvips_lib_dir
      npm_config_sharp_libvips_include_dir
      PKG_CONFIG_PATH
      npm_config_build_from_source
      npm_config_sqlite3_binary_host
      LD_LIBRARY_PATH
      ;
  };

  yarn-offline-cache = pkgs.fetchYarnDeps {
    yarnLock = "${src}/yarn.lock";
    hash = "sha256-D3pEF29EwEzfXtNST1+6s30+PKKdMDC06Z6/2JHj0Tw=";
  };

  development-base = pkgs.stdenv.mkDerivation (
    commonBuildAttrs
    // {
      name = "ghost-development-base";
      inherit src;

      nativeBuildInputs = nativeBuildInputs ++ [ pkgs.yarnConfigHook ];
      offlineCache = yarn-offline-cache;

      configurePhase = ''
        runHook preConfigure
        export HOME=$TMPDIR
        export npm_config_nodedir=${nodejs}
        export npm_config_node_gyp=${nodejs}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js
        runHook postConfigure
      '';

      buildPhase = ''
        runHook preBuild
        export HUSKY=0
        yarn install --frozen-lockfile --offline
        patchShebangs node_modules

        (cd node_modules/sqlite3 && ../.bin/node-gyp rebuild)
        (cd node_modules/sharp && ../.bin/node-gyp rebuild --directory=src)
        (cd node_modules/re2 && ../.bin/node-gyp rebuild)

        # Clean up native module build artifacts to reduce image size
        find node_modules -name "*.o" -delete
        find node_modules -name "*.a" -delete
        find node_modules -type d -name "obj.target" -exec rm -rf {} +

        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p $out
        cp -r . $out/
        runHook postInstall
      '';

      dontYarnBuild = true;
    }
  );

  commonBuildPhase = ''
    export HOME=$TMPDIR
    export PATH="$PWD/node_modules/.bin:$PATH"
  '';

  mkWorkspaceBuild =
    {
      name,
      workspacePath,
      extraDeps ? [ ],
    }:
    pkgs.stdenv.mkDerivation (
      commonBuildAttrs
      // {
        name = "ghost-${name}";
        src = development-base;

        buildPhase = ''
          runHook preBuild
          ${commonBuildPhase}

          ${lib.concatMapStringsSep "\n" (dep: ''
            mkdir -p ${dep.targetPath}
            cp -r ${dep.out}/* ${dep.targetPath}/
            chmod -R +w ${dep.targetPath}
          '') extraDeps}

          cd ${workspacePath}
          yarn build
          runHook postBuild
        '';

        installPhase = ''
          runHook preInstall
          mkdir -p $out
          [ -d dist ] && cp -r dist $out/
          [ -d es ] && cp -r es $out/
          [ -d types ] && cp -r types $out/
          [ -d umd ] && cp -r umd $out/
          [ -d public ] && cp -r public $out/
          runHook postInstall
        '';
      }
    );

  shade-builder = mkWorkspaceBuild {
    name = "shade";
    workspacePath = "apps/shade";
  };

  admin-x-design-system-builder = mkWorkspaceBuild {
    name = "admin-x-design-system";
    workspacePath = "apps/admin-x-design-system";
  };

  admin-x-framework-builder = mkWorkspaceBuild {
    name = "admin-x-framework";
    workspacePath = "apps/admin-x-framework";
    extraDeps = [
      {
        name = "shade";
        out = shade-builder;
        targetPath = "apps/shade";
      }
      {
        name = "admin-x-design-system";
        out = admin-x-design-system-builder;
        targetPath = "apps/admin-x-design-system";
      }
    ];
  };

  commonAdminDeps = [
    {
      name = "shade";
      out = shade-builder;
      targetPath = "apps/shade";
    }
    {
      name = "admin-x-design-system";
      out = admin-x-design-system-builder;
      targetPath = "apps/admin-x-design-system";
    }
    {
      name = "admin-x-framework";
      out = admin-x-framework-builder;
      targetPath = "apps/admin-x-framework";
    }
  ];

  stats-builder = mkWorkspaceBuild {
    name = "stats";
    workspacePath = "apps/stats";
    extraDeps = commonAdminDeps;
  };

  posts-builder = mkWorkspaceBuild {
    name = "posts";
    workspacePath = "apps/posts";
    extraDeps = commonAdminDeps;
  };

  portal-builder = mkWorkspaceBuild {
    name = "portal";
    workspacePath = "apps/portal";
  };

  admin-x-settings-builder = mkWorkspaceBuild {
    name = "admin-x-settings";
    workspacePath = "apps/admin-x-settings";
    extraDeps = commonAdminDeps;
  };

  activitypub-builder = mkWorkspaceBuild {
    name = "activitypub";
    workspacePath = "apps/activitypub";
    extraDeps = commonAdminDeps;
  };

  ghost-core-tsc-builder = pkgs.stdenv.mkDerivation (
    commonBuildAttrs
    // {
      name = "ghost-core-tsc";
      src = development-base;

      buildPhase = ''
        runHook preBuild
        ${commonBuildPhase}
        cd ghost/core
        yarn build:tsc
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p $out
        find core/server -name "*.js" -type f | while read f; do
          dir=$(dirname "$f")
          mkdir -p "$out/$dir"
          cp "$f" "$out/$dir/"
        done
        runHook postInstall
      '';
    }
  );

  ghost-assets-builder = pkgs.stdenv.mkDerivation (
    commonBuildAttrs
    // {
      name = "ghost-assets";
      src = development-base;

      buildPhase = ''
        runHook preBuild
        ${commonBuildPhase}
        cd ghost/core
        yarn build:assets
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p $out
        cp -r core/frontend/public $out/
        runHook postInstall
      '';
    }
  );

  admin-ember-builder = pkgs.stdenv.mkDerivation (
    commonBuildAttrs
    // {
      name = "ghost-admin-ember";
      src = development-base;

      buildPhase = ''
        runHook preBuild
        ${commonBuildPhase}

        mkdir -p apps/stats/dist apps/posts/dist apps/admin-x-settings/dist apps/activitypub/dist
        cp -r ${stats-builder}/dist/* apps/stats/dist/
        cp -r ${posts-builder}/dist/* apps/posts/dist/
        cp -r ${admin-x-settings-builder}/dist/* apps/admin-x-settings/dist/
        cp -r ${activitypub-builder}/dist/* apps/activitypub/dist/

        mkdir -p ghost/core/core/built/admin
        cd ghost/admin
        yarn build
        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p $out/admin-dist $out/admin-built
        cp -r dist $out/admin-dist/
        cp -r ../core/core/built/admin $out/admin-built/
        runHook postInstall
      '';
    }
  );

  ghost-app = pkgs.stdenv.mkDerivation {
    name = "ghost-app";
    src = development-base;

    buildPhase = ''
      runHook preBuild
      cp -r ${ghost-core-tsc-builder}/* ghost/core/
      cp -r ${ghost-assets-builder}/public ghost/core/core/frontend/public
      cp -r ${shade-builder}/* apps/shade/
      cp -r ${admin-x-design-system-builder}/* apps/admin-x-design-system/
      cp -r ${admin-x-framework-builder}/* apps/admin-x-framework/
      cp -r ${stats-builder}/* apps/stats/
      cp -r ${posts-builder}/* apps/posts/
      cp -r ${portal-builder}/* apps/portal/
      cp -r ${admin-x-settings-builder}/* apps/admin-x-settings/
      cp -r ${activitypub-builder}/* apps/activitypub/
      cp -r ${admin-ember-builder}/admin-dist/dist ghost/admin/dist
      mkdir -p ghost/core/core/built
      cp -r ${admin-ember-builder}/admin-built/admin ghost/core/core/built/admin
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      mkdir -p $out
      cp -r . $out/
      runHook postInstall
    '';
  };

in
{
  inherit
    yarn-offline-cache
    development-base
    shade-builder
    admin-x-design-system-builder
    admin-x-framework-builder
    stats-builder
    posts-builder
    portal-builder
    admin-x-settings-builder
    activitypub-builder
    ghost-core-tsc-builder
    ghost-assets-builder
    admin-ember-builder
    ghost-app
    ;

  dockerImage = pkgs.dockerTools.buildLayeredImage {
    name = "ghost";
    tag = "latest";

    contents = [
      etcFiles
      nodejs
      pkgs.bash
      pkgs.coreutils
      pkgs.findutils
      pkgs.gnugrep
      pkgs.which
      pkgs.procps
      pkgs.yarn
      pkgs.stripe-cli
      pkgs.vips
      pkgs.sqlite
    ];

    config = {
      WorkingDir = "/home/ghost";
      Cmd = [
        "${pkgs.yarn}/bin/yarn"
        "dev"
      ];

      Env = [
        "NODE_ENV=development"
        "NX_DAEMON=true"
        "GHOST_DEV_IS_DOCKER=true"
        "LD_LIBRARY_PATH=${commonEnv.LD_LIBRARY_PATH}"
        "PATH=/home/ghost/node_modules/.bin:/usr/bin:/bin:${nodejs}/bin:${pkgs.yarn}/bin:${pkgs.stripe-cli}/bin"
      ];

      ExposedPorts = {
        "2368/tcp" = { };
      };
    };

    extraCommands = ''
      mkdir -p home/ghost
      cp -r ${ghost-app}/. home/ghost/
      chmod -R +w home/ghost

      mkdir -p tmp
      chmod 1777 tmp
    '';

    maxLayers = 100;
  };
}
