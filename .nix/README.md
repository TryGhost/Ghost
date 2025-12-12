# Nix Build Infrastructure

## What This Gives You

This is a build system where:

- **Software is only built once, ever.** Any combination of inputs (source, dependencies, toolchain) produces a unique hash. Build it anywhere—your laptop, CI, a colleague's machine—and that hash goes into a shared cache. Everyone else downloads it instantly. No rebuilds.

- **Your laptop and CI produce bit-identical results.** Same inputs, same hash, same output. If it builds locally, it builds in CI. The "works on my machine" problem becomes architecturally impossible.

- **Once built, it cannot break.** A build that succeeded today will succeed tomorrow, next month, next year. No dependency drift, no upstream repository changes, no "the base image updated." The inputs are locked; the output is permanent.

- **Dev environments and Docker images from the same source.** The expressions that build the Docker image also define the local dev environment—same Node.js, same native dependencies, same toolchain. Combined with [process-compose](https://github.com/F1bonacc1/process-compose), this can replace Docker on dev machines entirely: native MySQL, Redis, and Ghost processes with 2-3 second startup, no VM overhead, no Docker Desktop eating 12GB of RAM on macOS.

There's a learning curve—[Nix](https://nixos.org) is a different paradigm. But the tradeoff is a CI system that's faster, completely deterministic, and eliminates entire categories of problems that teams typically accept as normal.

This isn't a fringe idea. There's a [cottage industry](https://www.youtube.com/results?search_query=nix+docker) of conference talks and blog posts on Nix for Docker builds. [Mitchell Hashimoto](https://mitchellh.com/writing/nix-with-dockerfiles) (of HashiCorp) has written about how Nix changed his view of what builds *should* be. It's a 20-year-old technology used at CERN, Shopify, Replit, and others—it just hasn't gone mainstream because the learning curve is real.

For a team of 10 engineers running hundreds of builds weekly, this translates to meaningful time savings: fewer re-runs, less debugging environment differences, more confidence shipping on any day of the week.

## Measured Results

**Build time with warm cache: 15-20 min → 3-6 min (70% faster)**

On self-hosted runners with a persistent Nix store, this could get as low as 1-3 minutes.

Data from GitHub Actions runs.

## What changes for developers?

Nothing, unless you want it to.

Developers without Nix installed continue using `yarn dev`, `docker-compose`, and existing workflows unchanged. The Nix CI runs in parallel with existing CI—it doesn't replace anything until the team decides to.

Developers *with* Nix installed get:
- 2-3 second dev environment startup (native processes, no Docker VM)
- Ability to warm CI cache from their laptop before pushing
- Pre-commit hook that catches stale dependency hashes locally

### 5-minute dev setup (no Docker required)

```bash
# Install Nix (one-time)
curl -sSf -L https://install.lix.systems/lix | sh -s -- install

# Install direnv (one-time)
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc  # or ~/.bashrc

# Enter the project
cd ~/Code/Ghost
direnv allow

# Start Ghost (native MySQL, Redis, Mailpit—no containers)
ghost-dev
```

That's it. No Docker Desktop, no VM, no 12GB of RAM overhead. Everything runs natively.

## Usage

```bash
# CI builds automatically via .github/workflows/ci-docker-nix.yml

# Local: update yarn hash after yarn.lock changes
nix run .#update-yarn-hash

# Local: warm the CI cache before pushing (optional)
nix run .#precache-package "git+file://$PWD" packages.aarch64-linux.dockerImage

# Local: native dev environment (optional, macOS/Linux)
nix develop
```

## Files

```
flake.nix                    # Package definitions
.docker-nix/default.nix      # Docker image build
.nix/
├── dev-shell.nix             # Development environment
├── update-yarn-hash/        # Hash update automation
├── precache-package/        # CI cache warming
├── githooks/                # Pre-commit validation
└── process-compose.yaml     # Local service orchestration
```

## Requirements

- Nix with flakes enabled (CI installs this automatically)
- Cachix auth token in `CACHIX_AUTH_TOKEN` secret (for cache writes)
- ~$100/month for [Cachix](https://cachix.org) binary cache hosting

**Note on the binary cache:** This PR currently uses my personal Cachix cache (`hello-stocha`) to demonstrate the system working end-to-end. For production adoption, Ghost would set up its own Cachix organization and replace the cache name in `flake.nix`, `.nix/precache-package/precache-package.sh`, and `.github/workflows/ci-docker-nix.yml`. Cachix is a trusted provider of Nix binary caching as a service—you're also free to self-host your own, which can be as simple as an S3 bucket. Happy to help with that transition.

## FAQ

**Why not just optimize the existing Dockerfile?**

Dockerfiles can be faster, but they can't be deterministic. Layer caching depends on instruction order and base image state. External repositories change. The same Dockerfile can produce different images on different days. Nix builds from the same commit will produce the same hash forever.

**What if the Nix maintainer leaves?**

Same risk as any infrastructure. The Nix code follows standard patterns (no clever hacks), is documented here, and 10,000+ NixOS contributors exist if expertise is needed. Rollback is one PR: delete the workflow file.

**Is this production-ready?**

This builds development images. Production images would need additional hardening (non-root user, minimal runtime, etc.). The infrastructure supports both; the current scope is development parity with the existing Docker workflow.
