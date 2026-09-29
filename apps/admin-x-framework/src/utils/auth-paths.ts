// Admin routes that serve the signed-out and session flows. `/setup/onboarding`
// is a signed-in screen, so only the bare `/setup` counts.
const AUTH_PATH_PATTERNS = [
  /^\/signin\/?$/,
  /^\/signin\/verify\/?$/,
  /^\/signout\/?$/,
  /^\/signup\/[^/]+\/?$/,
  /^\/reset\/[^/]+\/?$/,
  /^\/setup\/?$/,
];

/** Whether an Admin route path (optionally with a query string) is an authentication screen. */
export function isAuthPath(path: string): boolean {
  const [pathname] = path.split('?');
  return AUTH_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}
