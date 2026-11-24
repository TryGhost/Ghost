/**
 * A check, for a schema's `refine`, that text fits a column that holds `bytes` bytes. MySQL sizes
 * a text column in bytes of UTF-8, so a limit on characters lets through text the column can't
 * hold.
 */
export const maxBytes =
  (bytes: number) =>
  (text: string): boolean =>
    Buffer.byteLength(text) <= bytes;
