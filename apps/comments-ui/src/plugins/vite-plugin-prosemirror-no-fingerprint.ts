import type {Plugin} from 'vite';

/**
 * Vite plugin that patches ProseMirror and TipTap's browser detection to avoid
 * accessing high-entropy fingerprinting APIs (navigator.vendor,
 * navigator.platform, navigator.maxTouchPoints).
 *
 * DuckDuckGo's Tracker Radar classifies scripts that access these APIs with
 * fingerprinting score 3 (maximum), which causes Safari's Advanced Tracking
 * and Fingerprinting Protection and DuckDuckGo's browser to block the script.
 *
 * This plugin replaces those API accesses with equivalent checks using only
 * navigator.userAgent, reducing the fingerprinting surface.
 *
 * Affected packages:
 * - prosemirror-view: navigator.vendor, navigator.platform, navigator.maxTouchPoints
 * - prosemirror-keymap: navigator.platform
 * - prosemirror-commands: navigator.platform
 * - @tiptap/core: navigator.platform
 * - w3c-keyname: navigator.platform
 */
export default function prosemirrorNoFingerprint(): Plugin {
    return {
        name: 'prosemirror-no-fingerprint',
        enforce: 'pre',
        transform(code, id) {
            // Only transform prosemirror, tiptap, and w3c-keyname files
            const isProsemirror = id.includes('prosemirror-') && id.includes('dist');
            const isTiptap = id.includes('@tiptap') && id.includes('dist');
            const isW3cKeyname = id.includes('w3c-keyname');

            if (!isProsemirror && !isTiptap && !isW3cKeyname) {
                return null;
            }

            // Skip if no fingerprinting APIs present
            if (!code.includes('nav.vendor') &&
                !code.includes('nav.maxTouchPoints') &&
                !code.includes('nav.platform') &&
                !code.includes('navigator.platform')) {
                return null;
            }

            let modified = code;

            // --- prosemirror-view patches ---

            // Safari detection: nav.vendor → userAgent-based check
            modified = modified.replaceAll(
                '/Apple Computer/.test(nav.vendor)',
                '(/Safari\\//.test(agent) && !/Chrome\\//.test(agent) && !/Chromium\\//.test(agent))'
            );

            // iOS detection: remove navigator.maxTouchPoints fallback
            modified = modified.replaceAll(
                ' || !!nav && nav.maxTouchPoints > 2',
                ''
            );

            // Mac detection in prosemirror-view (uses local `nav` variable)
            modified = modified.replaceAll(
                'nav ? /Mac/.test(nav.platform) : false',
                '/Macintosh/.test(agent)'
            );

            // Windows detection in prosemirror-view
            modified = modified.replaceAll(
                'nav ? /Win/.test(nav.platform) : false',
                '/Windows/.test(agent)'
            );

            // --- prosemirror-keymap and prosemirror-commands patches ---
            // Pattern: /Mac|iP(hone|[oa]d)/.test(navigator.platform)
            modified = modified.replaceAll(
                '/Mac|iP(hone|[oa]d)/.test(navigator.platform)',
                '/Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent)'
            );

            // --- @tiptap/core patches ---

            // Android detection: navigator.platform === 'Android' → use UA only
            // The || /android/i.test(navigator.userAgent) already handles this
            modified = modified.replaceAll(
                'navigator.platform === \'Android\' || ',
                ''
            );

            // iOS detection: [device list].includes(navigator.platform)
            // Replace with UA-based check. The existing fallback
            // (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
            // already handles iPadOS. We just need iPhone/iPod UA detection.
            modified = modified.replaceAll(
                '].includes(navigator.platform)',
                '].length === 0 || /iPhone|iPod/.test(navigator.userAgent)'
            );

            // Mac detection in tiptap: /Mac/.test(navigator.platform)
            modified = modified.replaceAll(
                '/Mac/.test(navigator.platform)',
                '/Macintosh/.test(navigator.userAgent)'
            );

            // Verify all fingerprinting accesses were removed
            if (modified === code) {
                return null;
            }

            return {
                code: modified,
                map: null
            };
        }
    };
}
