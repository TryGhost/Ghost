const {createHeadlessEditor} = require('@lexical/headless');
const {html} = require('../utils');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {SignupNode, $createSignupNode, $isSignupNode} = require('../../');
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

    const checkGetters = (signupNode, data) => {
        signupNode.getAlignment().should.equal(data.alignment);
        signupNode.getBackgroundColor().should.equal(data.backgroundColor);
        signupNode.getBackgroundImageSrc().should.equal(data.backgroundImageSrc);
        signupNode.getTextColor().should.equal(data.textColor);
        signupNode.getButtonColor().should.equal(data.buttonColor);
        signupNode.getButtonText().should.equal(data.buttonText);
        signupNode.getButtonTextColor().should.equal(data.buttonTextColor);
        signupNode.getDisclaimer().should.equal(data.disclaimer);
        signupNode.getHeader().should.equal(data.header);
        signupNode.getLabels().should.deepEqual(data.labels);
        signupNode.getLayout().should.equal(data.layout);
        signupNode.getSubheader().should.equal(data.subheader);
        signupNode.getSuccessMessage().should.equal(data.successMessage);
        signupNode.getSwapped().should.equal(data.swapped);
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            backgroundColor: 'transparent',
            backgroundImageSrc: 'https://example.com/image.jpg',
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
            $isSignupNode(clonedSignupNode).should.be.true;
            clonedSignupNode.should.not.equal(signupNode);
            checkGetters(signupNode, dataset);
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
            checkGetters(signupNode, dataset);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createSignupNode(dataset);
            node.setAlignment('left');
            node.getAlignment().should.equal('left');
            node.setBackgroundColor('#f00');
            node.getBackgroundColor().should.equal('#f00');
            node.setBackgroundImageSrc('https://example.com/image2.jpg');
            node.getBackgroundImageSrc().should.equal('https://example.com/image2.jpg');
            node.setTextColor('#0f0');
            node.getTextColor().should.equal('#0f0');
            node.setButtonColor('#00f');
            node.getButtonColor().should.equal('#00f');
            node.setButtonTextColor('#777');
            node.getButtonTextColor().should.equal('#777');
            node.setButtonText('This is the new button text');
            node.getButtonText().should.equal('This is the new button text');
            node.setDisclaimer('This is the new disclaimer');
            node.getDisclaimer().should.equal('This is the new disclaimer');
            node.setHeader('This is the new header');
            node.getHeader().should.equal('This is the new header');
            // Labels are tested in a separate block below
            node.setLayout('compact');
            node.getLayout().should.equal('compact');
            node.setSubheader('This is the new subheader');
            node.getSubheader().should.equal('This is the new subheader');
            node.setSuccessMessage('This is the new success message');
            node.getSuccessMessage().should.equal('This is the new success message');
            node.setSwapped(true);
            node.getSwapped().should.equal(true);
        }));

        describe('labels', function () {
            it('can set multiple labels at once', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.setLabels(['new label 1', 'new label 2']);
                node.getLabels().should.deepEqual(['new label 1', 'new label 2']);
            }));

            it('only accepts an array of strings for setLabels', editorTest(function () {
                const node = $createSignupNode(dataset);
                (() => node.setLabels('label')).should.throwError();
                (() => node.setLabels(['label 1', 2])).should.throwError();
            }));

            it('can add one label to the existing array', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.addLabel('new label 3');
                node.getLabels().should.deepEqual(['label 1', 'label 2', 'new label 3']);
            }));

            it('can remove one label from the existing array', editorTest(function () {
                const node = $createSignupNode(dataset);
                node.removeLabel('label 2');
                node.getLabels().should.deepEqual(['label 1']);
            }));
        });

        it('has getDataset() method', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const nodeData = signupNode.getDataset();
            nodeData.should.deepEqual(dataset);
        }));

        it('has isEmpty() method', editorTest(function () {
            const signupNode = $createSignupNode(dataset);

            signupNode.isEmpty().should.be.false;
            signupNode.setBackgroundColor('');
            signupNode.isEmpty().should.be.false;
            signupNode.setBackgroundImageSrc('');
            signupNode.isEmpty().should.be.false;
            signupNode.setButtonColor('');
            signupNode.isEmpty().should.be.false;
            signupNode.setButtonText('');
            signupNode.isEmpty().should.be.false;
            signupNode.setDisclaimer('');
            signupNode.isEmpty().should.be.false;
            signupNode.setHeader('');
            signupNode.isEmpty().should.be.false;
            signupNode.setLabels([]);
            signupNode.isEmpty().should.be.false;
            signupNode.setSubheader('');
            signupNode.isEmpty().should.be.true;
        }));
    });

    describe('exportDOM', function () {
        const loadingIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24">
            <g stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor" stroke-linejoin="round" class="nc-icon-wrapper">
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
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-container align-center" style="background-color:transparent;background-image:url(https://example.com/image.jpg)">
                        <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                        <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                        <form class="kg-signup-card-form" data-members-form="">
                            <input data-members-label="" type="hidden" value="label 1">
                            <input data-members-label="" type="hidden" value="label 2">
                            <div class="kg-signup-card-fields">
                                <input class="kg-signup-card-input" style="border-color:#000000" id="email" data-members-email="" type="email" required="true" placeholder="yourname@example.com">
                                <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                    <span class="kg-signup-card-button-default">Button</span>
                                    <span class="kg-signup-card-button-loading" style="background-color:#000000">${loadingIcon}</span>
                                </button>
                            </div>
                            <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                            <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                        </form>
                        <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
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
                    <div class="kg-signup-card-container align-center" style="background-color:transparent;background-image:url(https://example.com/image.jpg)">
                        <form class="kg-signup-card-form" data-members-form="">
                            <input data-members-label="" type="hidden" value="label 1">
                            <input data-members-label="" type="hidden" value="label 2">
                            <div class="kg-signup-card-fields">
                                <input class="kg-signup-card-input" style="border-color:#000000" id="email" data-members-email="" type="email" required="true" placeholder="yourname@example.com">
                                <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                    <span class="kg-signup-card-button-default">Button</span>
                                    <span class="kg-signup-card-button-loading" style="background-color:#000000">${loadingIcon}</span>
                                </button>
                            </div>
                            <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                            <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                        </form>
                    </div>
                </div>
            `);
        }));

        it('renders accent classes', editorTest(function () {
            dataset.backgroundColor = 'accent';
            dataset.buttonColor = 'accent';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-container align-center kg-style-accent" style="background-color:accent;background-image:url(https://example.com/image.jpg)">
                        <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                        <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                        <form class="kg-signup-card-form" data-members-form="">
                            <input data-members-label="" type="hidden" value="label 1">
                            <input data-members-label="" type="hidden" value="label 2">
                            <div class="kg-signup-card-fields">
                                <input class="kg-signup-card-input kg-style-accent" style="border-color:accent" id="email" data-members-email="" type="email" required="true" placeholder="yourname@example.com">
                                <button class="kg-signup-card-button kg-style-accent" style="background-color:accent;color:#ffffff" type="submit">
                                    <span class="kg-signup-card-button-default">Button</span>
                                    <span class="kg-signup-card-button-loading" style="background-color:accent">${loadingIcon}</span>
                                </button>
                            </div>
                            <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                            <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                        </form>
                        <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                    </div>
                </div>
            `);
        }));

        it('renders split classes', editorTest(function () {
            dataset.layout = 'split';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full" data-lexical-signup-form="" style="display:none">
                    <img class="kg-signup-card-image" src="https://example.com/image.jpg" alt="">
                    <div class="kg-signup-card-container align-center" style="background-color:transparent">
                        <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                        <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                        <form class="kg-signup-card-form" data-members-form="">
                            <input data-members-label="" type="hidden" value="label 1">
                            <input data-members-label="" type="hidden" value="label 2">
                            <div class="kg-signup-card-fields">
                                <input class="kg-signup-card-input" style="border-color:#000000" id="email" data-members-email="" type="email" required="true" placeholder="yourname@example.com">
                                <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                    <span class="kg-signup-card-button-default">Button</span>
                                    <span class="kg-signup-card-button-loading" style="background-color:#000000">${loadingIcon}</span>
                                </button>
                            </div>
                            <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                            <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                        </form>
                        <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
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
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-container align-center" style="background-color:transparent">
                        <h2 class="kg-signup-card-heading" style="color:#000000">Header</h2>
                        <h3 class="kg-signup-card-subheading" style="color:#000000">Subheader</h3>
                        <form class="kg-signup-card-form" data-members-form="">
                            <input data-members-label="" type="hidden" value="label 1">
                            <input data-members-label="" type="hidden" value="label 2">
                            <div class="kg-signup-card-fields">
                                <input class="kg-signup-card-input" style="border-color:#000000" id="email" data-members-email="" type="email" required="true" placeholder="yourname@example.com">
                                <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                    <span class="kg-signup-card-button-default">Button</span>
                                    <span class="kg-signup-card-button-loading" style="background-color:#000000">${loadingIcon}</span>
                                </button>
                            </div>
                            <div class="kg-signup-card-success" style="color:#000000">Success!</div>
                            <div class="kg-signup-card-error" style="color:#000000" data-members-error=""></div>
                        </form>
                        <p class="kg-signup-card-disclaimer" style="color:#000000">Disclaimer</p>
                    </div>
                    <img class="kg-signup-card-image" src="https://example.com/image.jpg" alt="">
                </div>
            `);
        }));
    });
    describe('importDOM', function () {
        it('parses a signup card', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            checkGetters(nodes[0], dataset);
        }));

        it('parses split layout correctly', editorTest(function () {
            dataset.layout = 'split';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            checkGetters(nodes[0], dataset);
        }));

        it('parses with empty elements removed', editorTest(function () {
            dataset.header = '';
            dataset.subheader = '';
            dataset.disclaimer = '';

            const signupNode = $createSignupNode(dataset);
            const {element} = signupNode.exportDOM(exportOptions);

            const dom = new JSDOM(element.outerHTML).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            checkGetters(nodes[0], dataset);
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
                    checkGetters(signupNode, dataset);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
