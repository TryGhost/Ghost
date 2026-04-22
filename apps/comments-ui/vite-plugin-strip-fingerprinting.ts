import type {Plugin} from 'vite';

interface Replacement {
    search: string;
    replace: string;
    description: string;
}

interface PatternGroup {
    filePattern: RegExp;
    replacements: Replacement[];
}

/**
 * Vite plugin that patches ProseMirror and tiptap browser detection to avoid
 * accessing high-entropy fingerprinting APIs (navigator.vendor,
 * navigator.platform, navigator.maxTouchPoints).
 *
 * DuckDuckGo's Tracker Radar classifies scripts that access these APIs as
 * fingerprinting (score 3 = maximum). Safari's Advanced Fingerprinting
 * Protection (on by default since Safari 26, Sept 2025) uses this data to
 * restrict API access and storage for scripts from flagged domains like
 * cdn.jsdelivr.net.
 *
 * This plugin replaces those API accesses with equivalent checks using only
 * navigator.userAgent, which has a much lower fingerprinting weight.
 *
 * Affected packages:
 * - prosemirror-view: navigator.vendor, navigator.platform, navigator.maxTouchPoints
 * - prosemirror-keymap: navigator.platform
 * - prosemirror-commands: navigator.platform
 * - @tiptap/core: navigator.platform
 * - w3c-keyname: navigator.platform
 */
export function stripFingerprintingPlugin(): Plugin {
    const patternGroups: PatternGroup[] = [
        {
            filePattern: /prosemirror-view[\\/]dist[\\/]index\.js$/,
            replacements: [
                {
                    // Safari detection: nav.vendor → userAgent check
                    // Original: checks if vendor is "Apple Computer"
                    // Patched: checks UA for Safari without Chrome/Chromium
                    search: '/Apple Computer/.test(nav.vendor)',
                    replace: '/Safari\\//.test(agent) && !/Chrome\\//.test(agent) && !/Chromium\\//.test(agent)',
                    description: 'prosemirror-view: safari detection (nav.vendor)'
                },
                {
                    // iOS detection: remove nav.maxTouchPoints fallback
                    // Original: detects iPadOS via maxTouchPoints > 2
                    // Patched: relies on Mobile/xxx in UA only
                    // Trade-off: iPadOS 13+ sends desktop Mac UA, so it won't
                    // be detected as iOS. This is acceptable — iPad works fine
                    // with desktop Mac editor handling.
                    search: ' || !!nav && nav.maxTouchPoints > 2',
                    replace: '',
                    description: 'prosemirror-view: iOS detection (nav.maxTouchPoints)'
                },
                {
                    // Mac detection: nav.platform → userAgent check
                    search: 'nav ? /Mac/.test(nav.platform) : false',
                    replace: '/Macintosh/.test(agent)',
                    description: 'prosemirror-view: mac detection (nav.platform)'
                },
                {
                    // Windows detection: nav.platform → userAgent check
                    search: 'nav ? /Win/.test(nav.platform) : false',
                    replace: '/Windows/.test(agent)',
                    description: 'prosemirror-view: windows detection (nav.platform)'
                }
            ]
        },
        {
            filePattern: /prosemirror-keymap[\\/]dist[\\/]index\.js$/,
            replacements: [
                {
                    search: '/Mac|iP(hone|[oa]d)/.test(navigator.platform)',
                    replace: '/Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent)',
                    description: 'prosemirror-keymap: mac/iOS detection (navigator.platform)'
                }
            ]
        },
        {
            filePattern: /prosemirror-commands[\\/]dist[\\/]index\.js$/,
            replacements: [
                {
                    search: '/Mac|iP(hone|[oa]d)/.test(navigator.platform)',
                    replace: '/Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent)',
                    description: 'prosemirror-commands: mac/iOS detection (navigator.platform)'
                }
            ]
        },
        {
            filePattern: /w3c-keyname[\\/]index\.js$/,
            replacements: [
                {
                    search: '/Mac/.test(navigator.platform)',
                    replace: '/Macintosh/.test(navigator.userAgent)',
                    description: 'w3c-keyname: mac detection (navigator.platform)'
                }
            ]
        },
        {
            filePattern: /@tiptap[\\/]core[\\/]dist[\\/]index\.js$/,
            replacements: [
                {
                    // isAndroid: remove navigator.platform === 'Android' check,
                    // keep the userAgent fallback which already handles this
                    search: 'navigator.platform === \'Android\' || ',
                    replace: '',
                    description: '@tiptap/core: isAndroid (navigator.platform)'
                },
                {
                    // isiOS: replace navigator.platform array check with UA
                    // The array ['iPad Simulator', 'iPhone Simulator', ...] is
                    // still present but .includes() on it becomes a no-op.
                    // The UA check catches real iPhone/iPod devices.
                    // iPadOS 13+ is handled by the next line in tiptap:
                    //   navigator.userAgent.includes('Mac') && 'ontouchend' in document
                    search: '].includes(navigator.platform)',
                    replace: '].length === 0 || /iPhone|iPod/.test(navigator.userAgent)',
                    description: '@tiptap/core: isiOS (navigator.platform)'
                },
                {
                    // isMacOS: replace navigator.platform with userAgent
                    search: '/Mac/.test(navigator.platform)',
                    replace: '/Macintosh/.test(navigator.userAgent)',
                    description: '@tiptap/core: isMacOS (navigator.platform)'
                }
            ]
        }
    ];

    const appliedReplacements = new Map<string, Set<string>>();

    return {
        name: 'strip-fingerprinting',
        enforce: 'pre',

        buildStart() {
            appliedReplacements.clear();
        },

        transform(code: string, id: string) {
            const normalizedId = id.replace(/\\/g, '/');

            const group = patternGroups.find(g => g.filePattern.test(normalizedId));
            if (!group) {
                return null;
            }

            let transformed = code;
            let hasChanges = false;

            for (const replacement of group.replacements) {
                if (transformed.includes(replacement.search)) {
                    transformed = transformed.replaceAll(replacement.search, replacement.replace);
                    hasChanges = true;

                    if (!appliedReplacements.has(normalizedId)) {
                        appliedReplacements.set(normalizedId, new Set());
                    }
                    appliedReplacements.get(normalizedId)!.add(replacement.description);
                }
            }

            if (hasChanges) {
                return {code: transformed, map: null};
            }

            return null;
        },

        buildEnd() {
            const allDescriptions = patternGroups.flatMap(g => g.replacements.map(r => r.description));
            const applied = new Set(
                [...appliedReplacements.values()].flatMap(s => [...s])
            );

            const missing = allDescriptions.filter(d => !applied.has(d));

            if (missing.length > 0) {
                this.warn(
                    `strip-fingerprinting: ${missing.length} replacement(s) did not match. ` +
                    `Dependencies may have been updated. Unmatched:\n` +
                    missing.map(d => `  - ${d}`).join('\n')
                );
            }
        }
    };
}
