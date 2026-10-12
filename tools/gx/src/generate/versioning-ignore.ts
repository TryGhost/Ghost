// Comment heading the private-package block of `versioning.ignore`.
export const PRIVATE_BLOCK_MARKER = '# ignore private packages';

export function withPrivatePackageIgnored(text: string, name: string): string {
  const lines = text.split('\n');
  const markerIndex = lines.findIndex((line) => line.trim().startsWith(PRIVATE_BLOCK_MARKER));
  if (markerIndex === -1) {
    throw new Error(`Could not find "${PRIVATE_BLOCK_MARKER}" in pnpm-workspace.yaml`);
  }

  let start = markerIndex + 1;
  while (lines[start]?.trim().startsWith('#')) {
    start += 1;
  }
  let end = start;
  while (/^\s+- /.test(lines[end] ?? '')) {
    end += 1;
  }

  const entry = `    - '${name}'`;
  const block = lines.slice(start, end);
  if (block.includes(entry)) {
    return text;
  }

  lines.splice(start, end - start, ...[...block, entry].sort());
  return lines.join('\n');
}
