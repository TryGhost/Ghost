/** A typed 24-hour time as H, HH, H:mm, HH:mm or HHmm, or null. */
export function typedTime(input: string): { hour: number; minute: number } | null {
  const trimmed = input.trim();
  // Three digits are refused: `200` could be 2:00 or a slip for 20:00.
  const match = /^(\d?\d)(?::(\d\d))?$/.exec(trimmed) ?? /^(\d\d)(\d\d)$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  return hour > 23 || minute > 59 ? null : { hour, minute };
}
