import assert from 'node:assert/strict';
import {assertPrettifiedIncludes, assertPrettifiesTo, callRenderer, createDocument, html} from '../test-utils/index.js';

describe('renderers/header-v2-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            version: 2,
            backgroundImageSrc: 'https://example.com/image.jpg',
            buttonEnabled: true,
            buttonText: 'The button',
            buttonUrl: 'https://example.com/',
            header: 'This is the header card',
            size: 'small',
            style: 'image',
            subheader: 'hello',
            // default values used for rendering
            alignment: 'center',
            backgroundColor: '#000000',
            backgroundImageWidth: null,
            backgroundImageHeight: null,
            backgroundSize: 'cover',
            textColor: '#FFFFFF',
            buttonColor: '#ffffff',
            buttonTextColor: '#000000',
            layout: 'full',
            swapped: false,
            accentColor: '#FF1A75',
            ...overrides
        };
    }

    // Values containing characters that are special in HTML and in CSS
    const badText = 'Go <b>now</b> & "save"';
    const badUrl = 'https://example.org/a"b>c?x=1&y=<2>';
    const badImage = 'https://example.org/it\'s "a" (header).jpg';
    const encodedBadImage = 'https://example.org/it%27s%20%22a%22%20(header).jpg';
    const badColour = 'red; width: 100%';

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('header', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('header', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                    data-background-color="#000000">
                    <picture><img
                            class="kg-header-card-image"
                            src="https://example.com/image.jpg"
                            loading="lazy"
                            alt="" /></picture>
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2
                                id="this-is-the-header-card"
                                class="kg-header-card-heading"
                                style="color: #ffffff"
                                data-text-color="#FFFFFF">
                                This is the header card
                            </h2>
                            <p
                            id="hello"
                            class="kg-header-card-subheading"
                            style="color: #ffffff"
                            data-text-color="#FFFFFF">
                                hello
                            </p>
                            <a
                            href="https://example.com/"
                            class="kg-header-card-button"
                            style="background-color: #ffffff; color: #000000"
                            data-button-color="#ffffff"
                            data-button-text-color="#000000">The button</a>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders empty card when header and subheader is undefined and the button is disabled', function () {
            const result = renderForWeb(getTestData({header: null, subheader: null, buttonEnabled: false}));

            // v2 renderer has no empty check — it always returns a card element
            assert.ok(result.element);
            assert.equal(result.element.querySelector('.kg-header-card-heading'), null);
            assert.equal(result.element.querySelector('.kg-header-card-subheading'), null);
            assert.equal(result.element.querySelector('.kg-header-card-button'), null);
        });

        it('renders without subheader', async function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '',
                buttonEnabled: false,
                header: 'hello world',
                subheader: ''
            }));

            await assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                    style="background-color: #000000"
                    data-background-color="#000000">
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2
                                id="hello-world"
                                class="kg-header-card-heading"
                                style="color: #ffffff"
                                data-text-color="#FFFFFF">
                                hello world
                            </h2>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders with srcset', async function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '/content/images/2022/11/koenig-lexical.jpg',
                backgroundImageWidth: 3840,
                backgroundImageHeight: 2160,
                buttonEnabled: false,
                header: 'hello world',
                subheader: ''
            }));

            await assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                    data-background-color="#000000">
                    <picture><img
                            class="kg-header-card-image"
                            src="/content/images/2022/11/koenig-lexical.jpg"
                            srcset="/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w"
                            loading="lazy"
                            alt="" /></picture>
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2
                                id="hello-world"
                                class="kg-header-card-heading"
                                style="color: #ffffff"
                                data-text-color="#FFFFFF">
                                hello world
                            </h2>
                        </div>
                    </div>
                </div>
            `);
        });

        it('writes button text as text', function () {
            const result = renderForWeb(getTestData({buttonText: badText}));
            const link = createDocument(result.html).querySelector('.kg-header-card-button');

            assert.equal(link?.textContent, badText);
            assert.equal(link?.children.length, 0);
        });

        it('renders a button URL, background image and layout containing special characters', function () {
            const result = renderForWeb(getTestData({buttonUrl: badUrl, backgroundImageSrc: badImage, layout: 'wide" x="<y>'}));
            const document = createDocument(result.html);
            const card = document.body.firstElementChild;
            const image = document.querySelector('.kg-header-card-image');
            const link = document.querySelector('.kg-header-card-button');

            assert.equal(document.body.children.length, 1);
            assert.deepEqual(card?.getAttributeNames(), ['class', 'data-background-color']);
            assert.equal(card?.getAttribute('class'), 'kg-card kg-header-card kg-v2 kg-width-wide" x="<y> ');
            assert.deepEqual(image?.getAttributeNames(), ['class', 'src', 'loading', 'alt']);
            assert.equal(image?.getAttribute('src'), badImage);
            assert.deepEqual(link?.getAttributeNames(), ['href', 'class', 'style', 'data-button-color', 'data-button-text-color']);
            assert.equal(link?.getAttribute('href'), badUrl);
        });

        it('renders a srcset containing special characters', function () {
            const result = renderForWeb(getTestData({backgroundImageSrc: '/content/images/2022/11/a"b <c>.jpg', backgroundImageWidth: 3840, backgroundImageHeight: 2160}));
            const image = createDocument(result.html).querySelector('.kg-header-card-image');

            assert.deepEqual(image?.getAttributeNames(), ['class', 'src', 'srcset', 'loading', 'alt']);
            assert.equal(image?.getAttribute('src'), '/content/images/2022/11/a"b <c>.jpg');
            assert.equal(image?.getAttribute('srcset')?.split(', ')[0], '/content/images/size/w600/2022/11/a"b <c>.jpg 600w');
        });

        it('ignores a colour that isn\'t in a supported format', function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '',
                backgroundColor: badColour,
                textColor: badColour,
                buttonColor: 'rgb(255, 255, 255)',
                buttonTextColor: badColour
            }));
            const document = createDocument(result.html);
            const card = document.body.firstElementChild as HTMLElement;
            const heading = document.querySelector('.kg-header-card-heading') as HTMLElement;
            const link = document.querySelector('.kg-header-card-button') as HTMLElement;

            assert.equal(card.style.length, 0);
            assert.equal(card.getAttribute('data-background-color'), '');
            assert.equal(heading.style.length, 0);
            assert.equal(heading.getAttribute('data-text-color'), '');
            assert.deepEqual(Array.from(link.style), ['background-color']);
            assert.equal(link.getAttribute('data-button-color'), 'rgb(255, 255, 255)');
            assert.equal(link.getAttribute('data-button-text-color'), '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <div
                    class="kg-header-card kg-v2 kg-header-card-dark-bg"
                    style="
                        color: #ffffff;
                        text-align: center;
                        background-image: url('https://example.com/image.jpg');
                        background-size: cover;
                        background-position: center center;
                ">
                    <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="
                            color: #ffffff;
                            text-align: center;
                            background-image: url('https://example.com/image.jpg');
                            background-size: cover;
                            background-position: center center;
                    ">
                        <tbody>
                            <tr>
                                <!--[if mso]>
                        <td class="kg-header-card-content" style="padding: 0;">
                    <![endif]-->
                                <!--[if !mso]><!-->
                                <td class="kg-header-card-content" style="">
                                <!--<![endif]-->
                                    <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                            <v:fill src="https://example.com/image.jpg" color="#000000" type="frame" aspect="atleast" focusposition="0.5,0.5" />
                            <v:textbox inset="30pt,30pt,30pt,30pt" style="mso-fit-shape-to-text:true;">
                    <![endif]-->
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <h2 class="kg-header-card-heading" style="color: #ffffff">
                                                        This is the header card
                                                    </h2>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="kg-header-card-subheading-wrapper" align="center">
                                                    <p class="kg-header-card-subheading" style="color: #ffffff">
                                                        hello
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="kg-header-button-wrapper">
                                                    <table
                                                        class="btn"
                                                        border="0"
                                                        cellspacing="0"
                                                        cellpadding="0"
                                                        align="center">
                                                        <tbody>
                                                            <tr>
                                                                <td
                                                                    align="center"
                                                                    style="background-color: #ffffff;">
                                                                    <a href="https://example.com/" style="color: #000000 !important;">The button</a>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                <!--[if mso]>
            </v:textbox>
        </v:rect>
        <![endif]-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `);
        });

        it('has expected button output for outline buttons', async function () {
            const result = renderForEmail(getTestData(), {design: {buttonStyle: 'outline'}, feature: {}});

            await assertPrettifiedIncludes(result.html, html`
                <td align="center" style="color: #ffffff !important; border: 1px solid #ffffff; border-color: currentColor; background-color: transparent;">
                    <a href="https://example.com/" style="color: #ffffff !important">The button</a>
                </td>
            `);
        });

        it('renders a button URL and text containing special characters', function () {
            const result = renderForEmail(getTestData({buttonUrl: badUrl, buttonText: badText}));
            const link = createDocument(result.html).querySelector('table.btn a');

            assert.deepEqual(link?.getAttributeNames(), ['href', 'style']);
            assert.equal(link?.getAttribute('href'), badUrl);
            assert.equal(link?.textContent, badText);
            assert.equal(link?.children.length, 0);
        });

        it('renders a background image and alignment containing special characters', function () {
            const badAlignment = 'center" x="<y>';
            const result = renderForEmail(getTestData({backgroundImageSrc: badImage, alignment: badAlignment}));
            const document = createDocument(result.html);
            const card = document.body.firstElementChild as HTMLElement;

            assert.equal(document.body.children.length, 1);
            assert.deepEqual(card.getAttributeNames(), ['class', 'style']);
            assert.equal(card.style.backgroundImage, `url("${encodedBadImage}")`);
            assert.deepEqual(Array.from(document.querySelectorAll('h2, p')).map(el => el.parentElement?.getAttribute('align')), [badAlignment, badAlignment]);
            assert.ok(result.html.includes('<v:fill src="https://example.org/it&#039;s &quot;a&quot; (header).jpg" color="#000000"'));
        });

        it('renders a split layout background image containing special characters', function () {
            const result = renderForEmail(getTestData({backgroundImageSrc: badImage, layout: 'split'}));
            const document = createDocument(result.html);
            const cell = document.querySelector('td.kg-header-card-image') as HTMLElement;

            assert.deepEqual(cell.getAttributeNames(), ['background', 'style', 'class', 'bgcolor', 'align']);
            assert.equal(cell.getAttribute('background'), badImage);
            assert.equal(cell.style.backgroundImage, `url("${encodedBadImage}")`);
            assert.ok(result.html.includes('src="https://example.org/it&#039;s &quot;a&quot; (header).jpg" color="#000000"'));
        });

        it('ignores a colour that isn\'t in a supported format', function () {
            const result = renderForEmail(getTestData({
                backgroundImageSrc: '',
                backgroundColor: badColour,
                textColor: badColour,
                buttonColor: badColour
            }));
            const document = createDocument(result.html);
            const card = document.body.firstElementChild as HTMLElement;

            assert.deepEqual(Array.from(card.style), ['text-align']);
            assert.equal((document.querySelector('.kg-header-card-heading') as HTMLElement).style.length, 0);
            assert.deepEqual(document.querySelector('table.btn td')?.getAttributeNames(), ['align']);
        });

        it('ignores an accent colour that isn\'t in a supported format', function () {
            const result = renderForEmail(getTestData({backgroundImageSrc: '', backgroundColor: 'accent', accentColor: badColour}));
            const card = createDocument(result.html).body.firstElementChild as HTMLElement;

            assert.deepEqual(Array.from(card.style), ['color', 'text-align']);
        });
    });
});
