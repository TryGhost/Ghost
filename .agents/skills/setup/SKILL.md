---
name: setup
description: "Set up a Ghost development environment from scratch. Use this skill whenever the user wants to set up Ghost for local development, install dependencies, configure their dev environment, or troubleshoot setup issues. Triggers on: first-time setup, dev environment setup, installing Ghost dependencies, 'how do I run Ghost locally', 'yarn dev not working', missing dependencies, Docker/Node/Yarn installation issues."
---

# Ghost Development Environment Setup

Guide the user through setting up their Ghost development environment. The goal is to get from a fresh machine to a working `yarn dev` command.

## Overview

Ghost requires these system dependencies:
- **Node.js 22** (v22.18.0 recommended)
- **Yarn v1** (classic, not v2+)
- **Docker Engine + Docker Compose v2** (for MySQL, Redis, Mailpit, Caddy)
- **Git** (with submodule support)

## Instructions

Run the setup check script to determine what's installed and what's missing:

```bash
bash <project_root>/.agents/skills/setup/scripts/check-and-setup.sh
```

The script will:
1. Check for each required dependency
2. Report what's already installed and what's missing
3. Attempt to install missing dependencies automatically (requires sudo on Linux)
4. Run `yarn setup` (installs node_modules + initializes git submodules)
5. Print a final status summary

### Handling script output

After running the script, read its output carefully:

- **If everything succeeded**: Tell the user they're ready and can run `yarn dev` to start developing.
- **If there were failures**: Explain what failed and help troubleshoot. Common issues:
  - **Docker permission denied**: User needs to be in the `docker` group. Run `sudo usermod -aG docker $USER` then log out and back in (or run `newgrp docker`).
  - **Node version mismatch**: If they have nvm, suggest `nvm install 22.18.0 && nvm use 22.18.0`. If not, the script installs nvm for them.
  - **Yarn install failures**: Often caused by network issues. Suggest `yarn cache clean` and retrying, or `yarn fix` for a full reset.
  - **Docker daemon not running**: Suggest `sudo systemctl start docker` (Linux) or opening Docker Desktop (macOS).

### After successful setup

Let the user know:
- Run `yarn dev` to start Ghost (Docker backend + frontend dev servers)
- Ghost will be available at http://localhost:2368
- Ghost Admin at http://localhost:2368/ghost/
- Mailpit (test emails) at http://localhost:8025
- First time visiting `/ghost/` will prompt them to create an admin account
- Optional: `yarn reset:data` seeds the database with test data (1000 members, 100 posts)

### Platform notes

- **macOS**: Docker Desktop is needed (the script will detect this and guide the user to install it manually since it requires a GUI installer). Node.js via nvm works the same way.
- **Linux**: The script can install Docker Engine and everything else automatically with sudo access.
- **Windows**: WSL2 is recommended. The script works inside WSL2 with Ubuntu. Docker Desktop with WSL2 backend is needed.
