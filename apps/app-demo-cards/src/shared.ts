/** Where the app is served, which is also its backend. Set by the build. */
export const APP_ORIGIN: string =
  (import.meta.env?.VITE_APP_ORIGIN as string | undefined) ?? 'http://cards.localhost:5181';

export function text(properties: Record<string, unknown>, name: string, fallback = ''): string {
  const value = properties[name];
  return typeof value === 'string' ? value : fallback;
}
