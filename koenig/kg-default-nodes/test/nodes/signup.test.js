const {createHeadlessEditor} = require('@lexical/headless');
const {html} = require('../utils');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {SignupNode, $createSignupNode, $isSignupNode, $createPaywallNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [SignupNode];

describe('SignupNode', function () {
    let editor;
    let dataset;
    let exportOptions;

    const editorTest = testFn => function (done) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            backgroundColor: 'transparent',
            backgroundImageSrc: 'https://example.com/image.jpg',
            backgroundSize: 'cover',
            textColor: '#000000',
            buttonColor: '#000000',
            buttonText: 'Button',
            buttonTextColor: '#ffffff',
            disclaimer: 'Disclaimer',
            header: 'Header',
            subheader: 'Subheader',
            labels: ['label 1', 'label 2'],
            layout: 'regular',
            alignment: 'center',
            successMessage: 'Success!',
            swapped: false
        };

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isSignupNode', editorTest(function () {
        const signupNode = $createSignupNode(dataset);
        $isSignupNode(signupNode).should.be.true;
    }));

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const clonedSignupNode = SignupNode.clone(signupNode);
            clonedSignupNode.should.deepEqual(signupNode);
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            signupNode.hasEditMode().should.be.true;
        }));
    });

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            signupNode.alignment.should.equal(dataset.alignment);
            signupNode.backgroundColor.should.equal(dataset.backgroundColor);
            signupNode.backgroundImageSrc.should.equal(dataset.backgroundImageSrc);
            signupNode.backgroundSize.should.equal(dataset.backgroundSize);
            signupNode.textColor.should.equal(dataset.textColor);
            signupNode.buttonColor.should.equal(dataset.buttonColor);
            signupNode.buttonText.should.equal(dataset.buttonText);
            signupNode.buttonTextColor.should.equal(dataset.buttonTextColor);
            signupNode.disclaimer.should.equal(dataset.disclaimer);
            signupNode.header.should.equal(dataset.header);
            signupNode.labels.should.deepEqual(dataset.labels);
            signupNode.layout.should.equal(dataset.layout);
            signupNode.subheader.should.equal(dataset.subheader);
            signupNode.successMessage.should.equal(dataset.successMessage);
            signupNode.swapped.should.equal(dataset.swapped);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createSignupNode(dataset);

            node.alignment = 'left';
            node.backgroundColor = '#f00';
            node.backgroundSize = 'contain';
            node.backgroundImageSrc = 'https://example.com/image2.jpg';
            node.textColor = '#0f0';
            node.buttonColor = '#00f';
            node.buttonTextColor = '#777';
            node.buttonText = 'This is the new button text';
            node.disclaimer = 'This is the new disclaimer';
            node.header = 'This is the new header';
            node.layout = 'compact';
            node.subheader = 'This is the new subheader';
            node.successMessage = 'This is the new success message';
            node.swapped = true;
            // Labels are tested in a separate block below because they are handled differently
        }));

        describe('labels', function () {
            it('can set multiple labels at once', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.setLabels(['new label 1', 'new label 2']);
                node.labels.should.deepEqual(['new label 1', 'new label 2']);
            }));

            it('only accepts an array of strings for setLabels', editorTest(function () {
                const node = $createSignupNode(dataset);
                (() => node.setLabels('label')).should.throwError();
                (() => node.setLabels(['label 1', 2])).should.throwError();
            }));

            it('can add one label to the existing array', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.addLabel('new label 3');
                node.labels.should.deepEqual(['label 1', 'label 2', 'new label 3']);
            }));

            it('can remove one label from the existing array', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.removeLabel('label 2');
                node.labels.should.deepEqual(['label 1']);
            }));
        });

        it('has getDataset() method', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const nodeData = signupNode.getDataset();
            nodeData.should.deepEqual(dataset);
        }));
    });

    describe('exportDOM', function () {
        const loadingIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24">
            <g stroke-linecap="round" stroke-width="2" fill="currentColor" stroke="none" stroke-linejoin="round" class="nc-icon-wrapper">
                <g class="nc-loop-dots-4-24-icon-o">
                    <circle cx="4" cy="12" r="3"></circle>
                    <circle cx="12" cy="12" r="3"></circle>
                    <circle cx="20" cy="12" r="3"></circle>
                </g>
                <style data-cap="butt">
                    .nc-loop-dots-4-24-icon-o{--animation-duration:0.8s}
                    .nc-loop-dots-4-24-icon-o *{opacity:.4;transform:scale(.75);animation:nc-loop-dots-4-anim var(--animation-duration) infinite}
                    .nc-loop-dots-4-24-icon-o :nth-child(1){transform-origin:4px 12px;animation-delay:-.3s;animation-delay:calc(var(--animation-duration)/-2.666)}
                    .nc-loop-dots-4-24-icon-o :nth-child(2){transform-origin:12px 12px;animation-delay:-.15s;animation-delay:calc(var(--animation-duration)/-5.333)}
                    .nc-loop-dots-4-24-icon-o :nth-child(3){transform-origin:20px 12px}
                    @keyframes nc-loop-dots-4-anim{0%,100%{opacity:.4;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
                </style>
            </g>
        </svg>`;

        it('creates signup element', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form=""  style="display: none;">
                    <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""/></picture>
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                            <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="Your email">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                                <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        }));

        it('removes empty elements', editorTest(function () {
            dataset.header = '';
            dataset.subheader = '';
            dataset.disclaimer = '';
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display:none">
                    <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""/></picture>
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="Your email">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                                <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                            </form>
                        </div>
                    </div>
                </div>
            `);
        }));

        it('renders accent classes', editorTest(function () {
            dataset.backgroundColor = 'accent';
            dataset.buttonColor = 'accent';
            dataset.backgroundImageSrc = '';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-width-regular kg-style-accent" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                            <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="Your email">
                                    <button class="kg-signup-card-button kg-style-accent" style="color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                                <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        }));

        it('renders split classes', editorTest(function () {
            dataset.layout = 'split';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full" data-lexical-signup-form="" style="background-color: transparent; display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                            <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="Your email">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                                <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        }));

        it('renders split card swapped', editorTest(function () {
            dataset.layout = 'split';
            dataset.swapped = true;

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full kg-swapped" data-lexical-signup-form="" style="background-color: transparent; display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                            <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="Your email">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                                <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        }));

        it('renders background size', editorTest(function () {
            dataset.layout = 'split';
            dataset.backgroundSize = 'contain';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full kg-content-wide" data-lexical-signup-form="" style="background-color: transparent; display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                            <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="Your email">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                                <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        }));

        it('returns empty element if target is email', editorTest(function () {
            exportOptions.target = 'email';
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.equal('<div></div>');
        }));
    });
    describe('importDOM', function () {
        it('parses a signup card', editorTest(function () {
            dataset.backgroundColor = '#ffffff';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses split layout correctly', editorTest(function () {
            dataset.layout = 'split';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses split and swapped correctly', editorTest(function () {
            dataset.layout = 'split';
            dataset.swapped = true;
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses background size contain correctly', editorTest(function () {
            dataset.layout = 'split';
            dataset.backgroundSize = 'contain';
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses background size cover correctly', editorTest(function () {
            dataset.layout = 'split';
            dataset.backgroundSize = 'cover';
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses with empty elements removed', editorTest(function () {
            dataset.header = '';
            dataset.subheader = '';
            dataset.disclaimer = '';
            dataset.backgroundColor = '#ffffff';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses without image', editorTest(function () {
            // red background
            dataset.backgroundColor = '#ff0000';
            dataset.backgroundImageSrc = '';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));

        it('parses with accent button and background', editorTest(function () {
            dataset.backgroundColor = 'accent';
            dataset.buttonColor = 'accent';
            dataset.buttonTextColor = '#ffffff';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();

            json.should.deepEqual({
                type: 'signup',
                version: 1,
                alignment: dataset.alignment,
                backgroundColor: dataset.backgroundColor,
                backgroundImageSrc: dataset.backgroundImageSrc,
                backgroundSize: dataset.backgroundSize,
                textColor: dataset.textColor,
                buttonColor: dataset.buttonColor,
                buttonText: dataset.buttonText,
                buttonTextColor: dataset.buttonTextColor,
                disclaimer: dataset.disclaimer,
                header: dataset.header,
                labels: dataset.labels,
                layout: dataset.layout,
                subheader: dataset.subheader,
                successMessage: dataset.successMessage,
                swapped: dataset.swapped
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'signup',
                        ...dataset
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [signupNode] = $getRoot().getChildren();

                    $isSignupNode(signupNode).should.be.true;
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createPaywallNode();

            // signup nodes don't have text content
            node.getTextContent().should.equal('');
        }));
    });
});
