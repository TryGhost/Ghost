# Update yarn.lock hash in .docker-nix/default.nix
# Usage: nix run .#update-yarn-hash
{ pkgs }:

pkgs.writeShellApplication {
  name = "update-yarn-hash";
  runtimeInputs = [
    pkgs.nix
    pkgs.gnused
    pkgs.gnugrep
  ];
  text = builtins.readFile ./update-yarn-hash.sh;
}
