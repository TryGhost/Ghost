const userAgent = process.env.npm_config_user_agent || '';

if (/\bpnpm\//.test(userAgent)) {
    process.exit(0);
}

// Fallback heuristic for environments where npm_config_user_agent isn't
// propagated to lifecycle scripts (we've hit this on CI runners with mixed
// pnpm install layouts). pnpm-driven lifecycles typically set
// `pnpm_config_*` env vars, so we treat the presence of any such key as a
// strong-but-not-absolute signal that pnpm is the active package manager.
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
