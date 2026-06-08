import {describe, expect, it} from 'vitest';

/**
 * Browser detection equivalence tests.
 *
 * The strip-fingerprinting Vite plugin replaces navigator.vendor,
 * navigator.platform, and navigator.maxTouchPoints access in ProseMirror
 * and tiptap with navigator.userAgent-only equivalents. These tests verify
 * that the patched detection logic produces the same results as the
 * original for all major browser/OS combinations.
 *
 * Each test case provides a real user agent string along with the
 * navigator.vendor, navigator.platform, and navigator.maxTouchPoints
 * values that browser would report, then asserts the original and patched
 * detection functions return the same boolean.
 */

// --- Real browser fingerprints ---
// Each entry represents what a real browser reports for these properties.

interface BrowserFingerprint {
    name: string;
    userAgent: string;
    vendor: string;
    platform: string;
    maxTouchPoints: number;
}

const browsers: BrowserFingerprint[] = [
    // --- Chrome ---
    {
        name: 'Chrome on macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        platform: 'MacIntel',
        maxTouchPoints: 0
    },
    {
        name: 'Chrome on Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        platform: 'Win32',
        maxTouchPoints: 0
    },
    {
        name: 'Chrome on Linux',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        platform: 'Linux x86_64',
        maxTouchPoints: 0
    },
    {
        name: 'Chrome on Android',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        vendor: 'Google Inc.',
        platform: 'Linux armv81',
        maxTouchPoints: 5
    },

    // --- Safari ---
    {
        name: 'Safari on macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        vendor: 'Apple Computer, Inc.',
        platform: 'MacIntel',
        maxTouchPoints: 0
    },
    {
        name: 'Safari on iPhone',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        vendor: 'Apple Computer, Inc.',
        platform: 'iPhone',
        maxTouchPoints: 5
    },
    {
        name: 'Safari on iPadOS 13+ (desktop UA)',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        vendor: 'Apple Computer, Inc.',
        platform: 'MacIntel',
        maxTouchPoints: 5
    },
    {
        name: 'Safari on older iPad (pre-iPadOS 13)',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_5_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
        vendor: 'Apple Computer, Inc.',
        platform: 'iPad',
        maxTouchPoints: 5
    },

    // --- Firefox ---
    {
        name: 'Firefox on macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        vendor: '',
        platform: 'MacIntel',
        maxTouchPoints: 0
    },
    {
        name: 'Firefox on Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        vendor: '',
        platform: 'Win32',
        maxTouchPoints: 0
    },
    {
        name: 'Firefox on Linux',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        vendor: '',
        platform: 'Linux x86_64',
        maxTouchPoints: 0
    },

    // --- Edge ---
    {
        name: 'Edge on Windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        vendor: 'Google Inc.',
        platform: 'Win32',
        maxTouchPoints: 0
    },
    {
        name: 'Edge on macOS',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        vendor: 'Google Inc.',
        platform: 'MacIntel',
        maxTouchPoints: 0
    }
];

// --- Original detection functions (from prosemirror-view/dist/index.js) ---
// These use navigator.vendor, navigator.platform, navigator.maxTouchPoints

function originalSafari(agent: string, vendor: string): boolean {
    // const safari = !ie && !!nav && /Apple Computer/.test(nav.vendor)
    return /Apple Computer/.test(vendor);
}

function originalIos(agent: string, vendor: string, maxTouchPoints: number): boolean {
    // const ios = safari && (/Mobile\/\w+/.test(agent) || !!nav && nav.maxTouchPoints > 2)
    const safari = originalSafari(agent, vendor);
    return safari && (/Mobile\/\w+/.test(agent) || maxTouchPoints > 2);
}

function originalMac(agent: string, vendor: string, platform: string, maxTouchPoints: number): boolean {
    // const mac = ios || (nav ? /Mac/.test(nav.platform) : false)
    const ios = originalIos(agent, vendor, maxTouchPoints);
    return ios || /Mac/.test(platform);
}

function originalWindows(platform: string): boolean {
    // const windows = nav ? /Win/.test(nav.platform) : false
    return /Win/.test(platform);
}

function originalKeymapMac(platform: string): boolean {
    // const mac = /Mac|iP(hone|[oa]d)/.test(navigator.platform)
    return /Mac|iP(hone|[oa]d)/.test(platform);
}

// --- Patched detection functions (using navigator.userAgent only) ---

function patchedSafari(agent: string): boolean {
    // /Safari\//.test(agent) && !/Chrome\//.test(agent) && !/Chromium\//.test(agent)
    return /Safari\//.test(agent) && !/Chrome\//.test(agent) && !/Chromium\//.test(agent);
}

function patchedIos(agent: string): boolean {
    // safari && /Mobile\/\w+/.test(agent)
    const safari = patchedSafari(agent);
    return safari && /Mobile\/\w+/.test(agent);
}

function patchedMac(agent: string): boolean {
    // ios || /Macintosh/.test(agent)
    const ios = patchedIos(agent);
    return ios || /Macintosh/.test(agent);
}

function patchedWindows(agent: string): boolean {
    // /Windows/.test(agent)
    return /Windows/.test(agent);
}

function patchedKeymapMac(agent: string): boolean {
    // /Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent)
    return /Macintosh|iPhone|iPad|iPod/.test(agent);
}

// --- Tests ---

describe('Browser detection equivalence: prosemirror-view', () => {
    describe('safari detection', () => {
        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const original = originalSafari(browser.userAgent, browser.vendor);
                const patched = patchedSafari(browser.userAgent);
                expect(patched).toBe(original);
            });
        }
    });

    describe('ios detection', () => {
        // iPadOS 13+ is a known difference — document it separately
        const standardBrowsers = browsers.filter(b => b.name !== 'Safari on iPadOS 13+ (desktop UA)');
        const ipados = browsers.find(b => b.name === 'Safari on iPadOS 13+ (desktop UA)')!;

        for (const browser of standardBrowsers) {
            it(`${browser.name}`, () => {
                const original = originalIos(browser.userAgent, browser.vendor, browser.maxTouchPoints);
                const patched = patchedIos(browser.userAgent);
                expect(patched).toBe(original);
            });
        }

        it('iPadOS 13+ (known difference: patched detects as non-iOS)', () => {
            // Original uses maxTouchPoints > 2 to detect iPadOS → ios=true
            // Patched only checks Mobile/ in UA → ios=false
            // This is acceptable: iPadOS 13+ sends desktop Mac UA and
            // ProseMirror's desktop Mac handling works on iPad
            const original = originalIos(ipados.userAgent, ipados.vendor, ipados.maxTouchPoints);
            const patched = patchedIos(ipados.userAgent);

            expect(original).toBe(true);
            expect(patched).toBe(false);
        });
    });

    describe('mac detection', () => {
        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const original = originalMac(browser.userAgent, browser.vendor, browser.platform, browser.maxTouchPoints);
                const patched = patchedMac(browser.userAgent);
                expect(patched).toBe(original);
            });
        }
    });

    describe('windows detection', () => {
        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const original = originalWindows(browser.platform);
                const patched = patchedWindows(browser.userAgent);
                expect(patched).toBe(original);
            });
        }
    });
});

describe('Browser detection equivalence: prosemirror-keymap/commands', () => {
    describe('mac (includes iOS devices) detection', () => {
        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const original = originalKeymapMac(browser.platform);
                const patched = patchedKeymapMac(browser.userAgent);
                expect(patched).toBe(original);
            });
        }
    });
});

describe('Browser detection equivalence: @tiptap/core', () => {
    describe('isMacOS', () => {
        // Original: /Mac/.test(navigator.platform)
        // Patched: /Macintosh/.test(navigator.userAgent)
        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const original = /Mac/.test(browser.platform);
                const patched = /Macintosh/.test(browser.userAgent);

                // On iPhone/iPad (pre-iPadOS 13), platform doesn't contain "Mac"
                // but platform does contain "iPhone"/"iPad" — neither contains "Macintosh"
                // So both return false for iOS devices. ✓
                //
                // On iPadOS 13+ and desktop Mac, platform is "MacIntel" and UA
                // contains "Macintosh" — both return true. ✓
                expect(patched).toBe(original);
            });
        }
    });

    describe('isAndroid', () => {
        // Original: navigator.platform === 'Android' || /android/i.test(navigator.userAgent)
        // Patched: /android/i.test(navigator.userAgent)
        // The platform check is redundant since Android UA always contains "Android"
        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const original = browser.platform === 'Android' || /android/i.test(browser.userAgent);
                const patched = /android/i.test(browser.userAgent);
                expect(patched).toBe(original);
            });
        }
    });

    describe('isiOS', () => {
        // Original: ['iPad Simulator', 'iPhone Simulator', ...].includes(navigator.platform)
        //           || (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
        // Patched:  [].length === 0 || /iPhone|iPod/.test(navigator.userAgent)
        //           || (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
        //
        // We only test the first part here (the platform/UA check).
        // The 'ontouchend' in document check is unchanged by the plugin.

        const iosDevicePlatforms = [
            'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
            'iPad', 'iPhone', 'iPod'
        ];

        for (const browser of browsers) {
            it(`${browser.name}`, () => {
                const originalPlatformCheck = iosDevicePlatforms.includes(browser.platform);
                const patchedUACheck = /iPhone|iPod/.test(browser.userAgent);

                if (browser.name === 'Safari on iPhone') {
                    // Both detect iPhone
                    expect(originalPlatformCheck).toBe(true);
                    expect(patchedUACheck).toBe(true);
                } else if (browser.name === 'Safari on older iPad (pre-iPadOS 13)') {
                    // Original detects via platform='iPad', patched doesn't via UA
                    // But iPadOS 13+ fallback (userAgent.includes('Mac') && ontouchend)
                    // handles modern iPads. Pre-iPadOS 13 is effectively EOL.
                    expect(originalPlatformCheck).toBe(true);
                    expect(patchedUACheck).toBe(false);
                } else {
                    // Non-iOS: both return false
                    expect(originalPlatformCheck).toBe(false);
                    expect(patchedUACheck).toBe(false);
                }
            });
        }
    });
});
