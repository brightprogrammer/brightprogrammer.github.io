{
  description = "Dev shell for brightprogrammer.github.io (Hugo site)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          hugoPkg =
            if builtins.hasAttr "hugo-extended" pkgs then
              pkgs."hugo-extended"
            else if builtins.hasAttr "hugoExtended" pkgs then
              pkgs.hugoExtended
            else
              pkgs.hugo;
        in
        {
          default = pkgs.mkShell {
            packages = [
              hugoPkg
              # pkgs.nodejs
              pkgs.git
            ];
            shellHook = ''
              # if [ ! -d "node_modules" ]; then
              #   echo "Installing npm dependencies..."
              #   if [ -f "package-lock.json" ]; then
              #     npm ci
              #   else
              #     npm install
              #   fi
              # fi
              # echo "brightprogrammer.github.io dev shell ready (hugo + nodejs/npm)"
            '';
          };
        }
      );
    };
}
