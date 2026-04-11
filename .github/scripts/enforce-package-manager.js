const userAgent = process.env.npm_config_user_agent || '';

if (/\bpnpm\//.test(userAgent)) {
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
