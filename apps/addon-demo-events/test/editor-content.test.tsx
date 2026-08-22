import renderer from '../src/editor-content.tsx';
import {describe, expect, it} from 'vitest';

describe('events editor block', function () {
    it('renders the event as equivalent static web and portable content without hydration', async function () {
        const output = await renderer({
            blockName: 'event',
            context: {siteTimezone: 'Europe/Stockholm'},
            props: {
                title: 'Ghost Independent Publishing Summit',
                startsAt: '2026-10-15T16:30:00.000Z',
                location: 'Stockholm Waterfront',
                description: 'A practical afternoon for independent publishers.',
                url: 'https://example.com/register'
            }
        });

        for (const markup of [output.html, output.portableHtml]) {
            expect(markup).toContain('Ghost Independent Publishing Summit');
            expect(markup).toContain('Stockholm Waterfront');
            expect(markup).toContain('A practical afternoon for independent publishers.');
            expect(markup).toContain('October 15, 2026');
            expect(markup).toContain('18:30');
            expect(markup).toContain('Europe/Stockholm');
            expect(markup).toContain('https://example.com/register');
        }

        expect(renderer.hydrate).toBeUndefined();
    });

    it('does not interpret offset-less dates in the author device timezone', async function () {
        const output = await renderer({
            blockName: 'event',
            context: {siteTimezone: 'Europe/Stockholm'},
            props: {
                title: 'Timezone-safe event',
                startsAt: '2026-10-15T16:30'
            }
        });

        expect(output.html).toContain('Date to be announced');
        expect(output.html).not.toContain('18:30');
    });
});
