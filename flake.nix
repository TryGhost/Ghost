{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
  };

  outputs = {
    systems,
    nixpkgs,
    ...
  } @ inputs: let
    yarn_overlay = final: prev: {
        yarn = prev.yarn.overrideAttrs(finalAttrs: prevAttrs: {
            # This is to make sure that yarn runs the correct node version
            # https://github.com/NixOS/nixpkgs/issues/145634#issuecomment-1627476963
            installPhase = prevAttrs.installPhase + ''
                ln -fs $out/libexec/yarn/bin/yarn $out/bin/yarn
                ln -fs $out/libexec/yarn/bin/yarn.js $out/bin/yarn.js
                ln -fs $out/libexec/yarn/bin/yarn $out/bin/yarnpkg
            '';
        });
    };

    # This gives us a central place to set the node version
    node_overlay = final: prev: {
        nodejs = prev.nodejs-18_x;
    };

    eachSystem = f:
      nixpkgs.lib.genAttrs (import systems) (
        system:
          f ((nixpkgs.legacyPackages.${system}.extend yarn_overlay).extend node_overlay)
      );
  in {

    devShells = eachSystem (pkgs: {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
            nodejs
            yarn
        ];

        shellHook = ''
            echo "node `${pkgs.nodejs}/bin/node --version`"
        '';
      };
    });
  };
}
