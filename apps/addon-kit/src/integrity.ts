export async function verifyBundleIntegrity(source: string, integrity: string): Promise<void> {
    const match = /^sha256-(.+)$/.exec(integrity);
    if (!match) {
        throw new Error(`Unsupported integrity format: ${integrity}`);
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    const actual = btoa(String.fromCharCode(...new Uint8Array(digest)));
    if (actual !== match[1]) {
        throw new Error('Add-on bundle failed integrity verification');
    }
}
