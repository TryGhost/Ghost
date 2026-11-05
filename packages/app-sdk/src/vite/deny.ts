// What Vite denies when a project names nothing to deny, as of Vite 8. A project's own list
// replaces these rather than adding to them, and Vite compiles the list before any plugin sees
// the resolved config, so the plugin adds them again alongside the keys. The tests compare it
// with what the installed Vite resolves.
export const VITE_DEFAULT_DENY = [
  '.env',
  '.env.*',
  '*.{crt,pem,key,p12,pfx,cer,der}',
  '.npmrc',
  '.yarnrc.yml',
  '**/.git/**',
];

// The private keys, and `.dev.vars`, which holds the development backend key. Vite serves the
// project's root, so without these anyone who can reach the dev server, through a tunnel too,
// could read them as files, through `/@fs/` or as imports. `.env` files are denied even when a
// project's own list leaves them out, as the plugin may tell a Workers project to put the
// development backend key in one.
export const DENY = ['**/.ghost-app/**', '.dev.vars*', '.env', '.env.*'];
