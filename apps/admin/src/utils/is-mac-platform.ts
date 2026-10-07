/** Whether the writer is on a Mac, which decides the modifier keys shown to them. */
export function isMacPlatform(userAgent: string = navigator.userAgent): boolean {
  return userAgent.indexOf('Mac') !== -1;
}
