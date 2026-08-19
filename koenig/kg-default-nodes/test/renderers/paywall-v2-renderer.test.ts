import {callRenderer} from '../test-utils/index.js';

describe('renderers/paywallv2-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            access: 'paid',
            tiers: [],
            webLayout: 'immersive',
            webAlignment: 'left',
            webBackgroundColor: 'grey',
            webLinkColor: 'text',
            webShowDividers: true,
            webButtonColor: '#000000',
            webButtonTextColor: '#ffffff',
            emailLayout: 'immersive',
            emailAlignment: 'left',
            emailBackgroundColor: 'grey',
            emailLinkColor: 'text',
            emailShowDividers: true,
            emailButtonColor: '#000000',
            emailButtonTextColor: '#ffffff',
            webHeading: '<p><span>Upgrade to continue reading</span></p>',
            webTextValue: '<p>This part is for paid members.</p>',
            webShowButton: true,
            webButtonText: 'Upgrade',
            webButtonUrl: 'http://blog.com/#/portal/signup',
            webImageUrl: 'http://blog.com/image1.jpg',
            webImageWidth: 200,
            webImageHeight: 100,
            emailHeading: '<p><span>Keep reading on the web</span></p>',
            emailTextValue: '<p>Upgrade to get the rest in your inbox.</p>',
            emailShowButton: true,
            emailButtonText: 'Upgrade',
            emailButtonUrl: 'http://blog.com/#/portal/signup',
            emailImageUrl: '',
            emailImageWidth: null,
            emailImageHeight: null,
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('paywall-v2', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('paywall-v2', data, {...options, target: 'email', design: {}});
    }

    // The brand colour is the one background whose contrast can't be known in
    // CSS, so the renderer computes the readable text colour and writes it on
    // the card. Ghost's other accent-backed cards hardcode white, which
    // disappears on a pale brand colour.
    describe('the brand colour background', function () {
        it('writes a light text colour over a dark accent', function () {
            const {html} = renderForWeb(
                getTestData({webBackgroundColor: 'accent'}),
                {design: {accentColor: '#15171A'}}
            );

            expect(html).toContain('kg-paywall-bg-accent');
            expect(html).toMatch(/style="color: #f{6};"/i);
        });

        it('writes a dark text colour over a pale accent', function () {
            const {html} = renderForWeb(
                getTestData({webBackgroundColor: 'accent'}),
                {design: {accentColor: '#FFF6D5'}}
            );

            expect(html).toMatch(/style="color: #0{6};"/i);
        });

        it('does the same in email', function () {
            const {html} = callRenderer('paywall-v2', getTestData({emailBackgroundColor: 'accent'}), {
                target: 'email',
                design: {accentColor: '#15171A'}
            });

            expect(html).toContain('kg-paywall-bg-accent');
            expect(html).toMatch(/style="color: #f{6};"/i);
        });

        // every other background is a fixed tint whose text colour lives in the
        // stylesheet - an inline colour would override it
        it('leaves other backgrounds to the stylesheet', function () {
            const {html} = renderForWeb(
                getTestData({webBackgroundColor: 'grey'}),
                {design: {accentColor: '#15171A'}}
            );

            expect(html).not.toMatch(/<div class="kg-card kg-paywall-card[^"]*"[^>]*style="color:/);
        });

        // the button has to invert or it fights the panel it sits on - it takes
        // the card's text colour, and its label takes the card colour
        it('inverts the button against the card', function () {
            const {html} = renderForWeb(
                getTestData({webBackgroundColor: 'accent', webButtonColor: '#000000'}),
                {design: {accentColor: '#15171A'}}
            );

            expect(html).toContain('background-color: #FFFFFF; color: #15171A;');
        });

        it('inverts the email button too', function () {
            const {html} = callRenderer('paywall-v2', getTestData({
                emailBackgroundColor: 'accent',
                emailButtonColor: '#000000'
            }), {target: 'email', design: {accentColor: '#15171A', buttonStyle: 'fill'}});

            expect(html).toContain('#FFFFFF');
            expect(html).toContain('#15171A');
        });

        // every element carries its own colour rather than inheriting - email
        // inlining makes `inherit` unreliable
        it('writes the colour onto the text as well as the card', function () {
            const {html} = renderForWeb(
                getTestData({webBackgroundColor: 'accent'}),
                {design: {accentColor: '#15171A'}}
            );

            expect(html).toMatch(/class="kg-paywall-heading"[^>]*style="color: #FFFFFF;"/);
            expect(html).toMatch(/class="kg-paywall-text"[^>]*style="color: #FFFFFF;"/);
        });

        // a consumer that doesn't supply the accent gets no guess
        it('writes nothing when the accent is unknown', function () {
            const {html} = renderForWeb(getTestData({webBackgroundColor: 'accent'}), {design: {}});

            expect(html).not.toMatch(/<div class="kg-card kg-paywall-card[^"]*"[^>]*style="color:/);
        });
    });

    describe('web', function () {
        it('renders the card followed by the members-only marker', function () {
            const {html} = renderForWeb(getTestData());

            expect(html).toContain('kg-paywall-card');
            expect(html).toContain('<!--members-only-->');
            expect(html.indexOf('kg-paywall-card')).toBeLessThan(html.indexOf('<!--members-only-->'));
        });

        it('wraps the card in a gated block so members with access never see it', function () {
            const {html} = renderForWeb(getTestData({access: 'paid'}));

            expect(html).toContain('<!--kg-gated-block:begin nonMember:true memberSegment:"status:free" -->');
            expect(html).toContain('<!--kg-gated-block:end-->');
        });

        it('gates against no member segment for members-only access', function () {
            const {html} = renderForWeb(getTestData({access: 'members'}));

            expect(html).toContain('memberSegment:""');
        });

        it('negates the selected tiers for tier access', function () {
            const {html} = renderForWeb(getTestData({access: 'tiers', tiers: ['gold']}));

            expect(html).toContain(`memberSegment:"product:-'gold'"`);
        });

        it('renders the web content, not the email content', function () {
            const {html} = renderForWeb(getTestData());

            expect(html).toContain('Upgrade to continue reading');
            expect(html).not.toContain('Keep reading on the web');
        });

        it('leaves the web button url as a bare hash so it works on any post', function () {
            const {html} = renderForWeb(getTestData({webButtonUrl: '#/portal/signup'}));

            expect(html).toContain('href="#/portal/signup"');
        });

        it('unwraps the nested-editor paragraph so the heading is valid markup', function () {
            const {html} = renderForWeb(getTestData());

            expect(html).toContain('class="kg-paywall-heading"');
            expect(html).not.toMatch(/class="kg-paywall-heading"[^>]*><p>/);
        });

        it('renders the heading without a heading element, so themes cannot force a weight', function () {
            const {html} = renderForWeb(getTestData({webHeading: '<p><strong>Bold heading</strong></p>'}));

            // bold has to come from the content - an <h3> would be styled bold by
            // the theme whatever the author does in the editor, so the semantics
            // come from ARIA instead
            expect(html).not.toMatch(/<h[1-6][^>]*class="kg-paywall-heading"/);
            expect(html).toContain('role="heading"');
            expect(html).toContain('aria-level="3"');
            expect(html).toContain('<strong>Bold heading</strong>');
        });

        it('always renders the immutable sign-in footer', function () {
            const {html} = renderForWeb(getTestData());

            expect(html).toContain('kg-paywall-footer');
            expect(html).toContain('Already a member?');
            expect(html).toContain('data-portal="signin"');
        });

        it('renders the image when one is set', function () {
            const {html} = renderForWeb(getTestData());

            expect(html).toContain('kg-paywall-image-container');
            expect(html).toContain('data-image-dimensions="200x100"');
        });

        it('skips the button when the url is missing', function () {
            const {html} = renderForWeb(getTestData({webButtonUrl: ''}));

            expect(html).not.toContain('kg-paywall-button');
        });

        it('falls back to a valid background color', function () {
            const {html} = renderForWeb(getTestData({webBackgroundColor: 'not a color'}));

            expect(html).toContain('kg-paywall-bg-grey');
        });

        it('takes its design from the web settings, independently of email', function () {
            const {html} = renderForWeb(getTestData({
                webBackgroundColor: 'blue',
                webAlignment: 'center',
                emailBackgroundColor: 'red',
                emailAlignment: 'left'
            }));

            expect(html).toContain('kg-paywall-bg-blue');
            expect(html).toContain('kg-paywall-centered');
            expect(html).not.toContain('kg-paywall-bg-red');
        });

        it('renders the members-only marker even before access is chosen', function () {
            const {html} = renderForWeb(getTestData({access: null}));

            expect(html).toContain('<!--members-only-->');
            expect(html).toContain('memberSegment:""');
        });
    });

    describe('email', function () {
        it('renders a table layout with the email content', function () {
            const {html} = renderForEmail(getTestData());

            expect(html).toContain('<table');
            expect(html).toContain('Keep reading on the web');
            expect(html).not.toContain('Upgrade to continue reading');
        });

        it('marks the card for the renderer to drop where the audience has access', function () {
            const {html} = renderForEmail(getTestData({access: 'paid'}));

            expect(html).toContain('data-gh-paywall="true"');
            expect(html).toContain('<!--members-only-->');
        });

        it('marks a tier-gated card the same way, since no free/paid segment describes it', function () {
            const {html} = renderForEmail(getTestData({access: 'tiers', tiers: ['bronze', 'gold']}));

            expect(html).toContain('data-gh-paywall="true"');
            expect(html).toContain('kg-paywall-card');
            expect(html).not.toContain('data-gh-segment');
        });

        it('renders only the marker for members-only access, since every recipient is a member', function () {
            const {html} = renderForEmail(getTestData({access: 'members'}));

            expect(html).not.toContain('kg-paywall-card');
            expect(html).toContain('<!--members-only-->');
        });

        it('takes its design from the email settings, independently of web', function () {
            const {html} = renderForEmail(getTestData({
                webBackgroundColor: 'blue',
                emailBackgroundColor: 'red',
                emailAlignment: 'center'
            }));

            expect(html).toContain('kg-paywall-bg-red');
            expect(html).toContain('kg-paywall-centered');
            expect(html).not.toContain('kg-paywall-bg-blue');
        });

        it('has no sign-in footer', function () {
            const {html} = renderForEmail(getTestData());

            expect(html).not.toContain('kg-paywall-footer');
        });

        it('skips the button when the text is missing', function () {
            const {html} = renderForEmail(getTestData({emailButtonText: ''}));

            expect(html).not.toContain('kg-paywall-button-container');
        });

        it('expands a Portal hash link against the post url', function () {
            const {html} = renderForEmail(
                getTestData({emailButtonUrl: '#/portal/signup'}),
                {postUrl: 'http://blog.com/my-post/'}
            );

            expect(html).toContain('href="http://blog.com/my-post/#/portal/signup"');
        });

        it('leaves an absolute button url alone', function () {
            const {html} = renderForEmail(
                getTestData({emailButtonUrl: 'https://example.com/upgrade'}),
                {postUrl: 'http://blog.com/my-post/'}
            );

            expect(html).toContain('href="https://example.com/upgrade"');
        });

        it('leaves the hash link as-is when there is no post url', function () {
            const {html} = renderForEmail(getTestData({emailButtonUrl: '#/portal/signup'}), {postUrl: undefined});

            expect(html).toContain('href="#/portal/signup"');
        });
    });
});
