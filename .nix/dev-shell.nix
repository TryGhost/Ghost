# Ghost development shell environment
{ pkgs }:

let
  # Create a Python environment with setuptools for distutils compatibility
  pythonWithSetuptools = pkgs.python312.withPackages (
    ps: with ps; [
      setuptools
    ]
  );

  # Dev script for easy startup
  devScript = pkgs.writeShellApplication {
    name = "ghost-dev";
    runtimeInputs = [ pkgs.process-compose ];
    text = ''
      exec process-compose -f ./.nix/process-compose.yaml up "$@"
    '';
  };

  # Setup script for initial Ghost configuration
  devSetupScript = pkgs.writeShellApplication {
    name = "ghost-dev-setup";
    runtimeInputs = [
      pkgs.mysql80
      pkgs.git
    ];
    text = ''
      echo "🔮 Ghost Setup"
      echo ""

      # Ensure Casper theme is present
      if [ ! -d "ghost/core/content/themes/casper/.git" ]; then
        echo "📦 Cloning Casper theme..."
        if [ -d "ghost/core/content/themes/casper" ]; then
          rm -rf ghost/core/content/themes/casper
        fi
        git clone --depth 1 https://github.com/TryGhost/Casper.git ghost/core/content/themes/casper
        echo "✅ Casper theme installed"
      else
        echo "✅ Casper theme already installed"
      fi

      # Update active theme in database if MySQL is running
      if [ -S ".dev-data/mysql.sock" ]; then
        echo ""
        echo "📝 Setting active theme to Casper..."
        mysql -u root -S .dev-data/mysql.sock ghost -e "UPDATE settings SET value='casper' WHERE \`key\`='active_theme';" 2>/dev/null || true
        echo "✅ Active theme set to Casper"
      else
        echo ""
        echo "ℹ️  MySQL not running - theme will be set on first startup"
      fi

      echo ""
      echo "✨ Setup complete! Run 'ghost-dev' to start Ghost."
    '';
  };
in
pkgs.mkShell {
  packages = with pkgs; [
    # Core runtime
    nodejs_22
    yarn

    # Databases
    sqlite
    mysql80
    redis

    # Email testing
    mailpit

    # Build toolchain for native modules
    pkg-config
    pythonWithSetuptools # Python 3.12 with setuptools for distutils
    stdenv.cc
    gnumake

    # Image processing (for sharp npm package)
    vips
    libpng
    libjpeg
    libwebp
    giflib
    librsvg

    # Development utilities
    git
    jq
    curl
    process-compose
    cachix # Binary cache for faster Nix builds

    # Custom dev scripts
    devScript
    devSetupScript
  ];

  shellHook = ''
    echo ""
    echo "🔮 Ghost development environment loaded"
    echo ""
    echo "Node.js: $(node --version)"
    echo "Yarn: $(yarn --version)"
    echo "SQLite: $(sqlite3 --version | cut -d' ' -f1)"
    echo ""

    # Disable Husky git hooks
    export HUSKY=0

    # Export Nix paths for native module compilation
    export PKG_CONFIG_PATH="${pkgs.vips}/lib/pkgconfig:$PKG_CONFIG_PATH"
    export LD_LIBRARY_PATH="${pkgs.vips}/lib:${pkgs.sqlite}/lib:$LD_LIBRARY_PATH"

    # Configure sharp to use system vips
    export npm_config_sharp_libvips_lib_dir="${pkgs.vips}/lib"
    export npm_config_sharp_libvips_include_dir="${pkgs.vips}/include"

    # Force sqlite3 to build against system sqlite
    export npm_config_build_from_source=true
    export npm_config_sqlite3_binary_host=""

    # Force node-gyp to use our Python with setuptools (multiple methods for compatibility)
    export PYTHON="${pythonWithSetuptools}/bin/python3"
    export npm_config_python="${pythonWithSetuptools}/bin/python3"
    export GYP_PYTHON="${pythonWithSetuptools}/bin/python3"

    if [ -n "$CACHIX_AUTH_TOKEN" ]; then
      echo "✅ Cachix configured for: $CACHIX_CACHE"
      echo ""
    else
      echo "⚡ Enable Cachix for dramatically faster builds!"
      echo "   Create .envrc.local, gitignored, with:"
      echo ""
      echo "   export CACHIX_AUTH_TOKEN=\"your-token\""
      echo "   export CACHIX_CACHE=\"hello-stocha\""
      echo ""
    fi

    echo "To get started:"
    echo "  ghost-dev          # Start Ghost (runs process-compose)"
    echo ""
    echo "Or manually:"
    echo "  1. yarn install    # Install dependencies"
    echo "  2. yarn dev        # Start Ghost directly"
    echo ""
  '';
}
