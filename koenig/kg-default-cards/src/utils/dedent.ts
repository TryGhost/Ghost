export default function dedent(str: string): string {
    const lines = str.split(/\n/);
    return lines.map(line => line.replace(/^\s+/gm, '')).join('').trim();
}
