const userAgent = process.env.npm_config_user_agent || '';

if (/\bpnpm\//.test(userAgent)) {
    process.exit(0);
}

// Fallback for environments where pnpm 11 doesn't propagate
// npm_config_user_agent to lifecycle scripts — observed on GitHub Actions
// where the runner's pre-installed pnpm v10 shim layer strips the var even
// when pnpm 11 is the active binary. The `pnpm_config_*` env-var prefix is
// exclusive to pnpm and reliably set when pnpm 11 spawns a child process.
if (Object.keys(process.env).some(key => key.startsWith('pnpm_config_'))) {
    process.exit(0);
}

const detectedPackageManager = userAgent.split(' ')[0] || 'unknown';

console.error(`
Ghost now uses pnpm for dependency installation.

Detected package manager: ${detectedPackageManager}

Use one of these instead:
  corepack enable pnpm
  pnpm install

Common command replacements:
  yarn setup   -> pnpm run setup
  yarn dev     -> pnpm dev
  yarn test    -> pnpm test
  yarn lint    -> pnpm lint
`);

process.exit(1);
