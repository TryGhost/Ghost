# Precache builds to binary cache for faster CI
# Usage: nix run .#precache-package <flake-url> <output>
{ pkgs }:

pkgs.writeShellApplication {
  name = "precache-package";
  runtimeInputs = [
    pkgs.nix
    pkgs.cachix
  ];
  text = builtins.readFile ./precache-package.sh;
}
