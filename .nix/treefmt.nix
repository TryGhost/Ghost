{ pkgs, ... }:
{
  enableDefaultExcludes = true;

  projectRootFile = "flake.nix";

  programs.nixfmt.enable = true;
  programs.nixfmt.package = pkgs.nixfmt-rfc-style;
  programs.nixfmt.includes = [
    "*.nix"
    "**/*.nix"
  ];
}
