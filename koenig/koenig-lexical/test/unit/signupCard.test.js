import {$createSignupNode, SignupNode} from '../../src/nodes/SignupNode';
const {createHeadlessEditor} = require('@lexical/headless');

const editorNodes = [SignupNode];

describe('SignupNode', function () {
    let editor;
    let dataset;

    const editorTest = testFn => function () {
        let resolve, reject;
        const promise = new Promise((resolve_, reject_) => {
            resolve = resolve_;
            reject = reject_;
        });

        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (error) {
                reject(error);
            }
        });

        return promise;
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});
        dataset = {
            type: 'signup',
            version: 1,
            alignment: 'left',
            backgroundColor: '#F0F0F0',
            backgroundImageSrc: '',
            backgroundSize: 'cover',
            textColor: '#000000',
            buttonColor: 'accent',
            buttonTextColor: '#FFFFFF',
            buttonText: 'Subscribe',
            disclaimer: '<span style="white-space: pre-wrap;">No spam. Unsubscribe anytime.</span>',
            header: '<span style="white-space: pre-wrap;">Sign up for Koenig Lexical</span>',
            labels: [],
            layout: 'wide',
            subheader: '<span style="white-space: pre-wrap;">There\'s a whole lot to discover in this editor. Let us help you settle in.</span>',
            successMessage: 'Email sent! Check your inbox to complete your signup.',
            swapped: false
        };
    });

    describe('Content load and export testing', function () {  
        it('handles "normal" content', editorTest(function () {
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            expect(json.header).toEqual('<span style="white-space: pre-wrap;">Sign up for Koenig Lexical</span>');
            expect(json.subheader).toEqual('<span style="white-space: pre-wrap;">There\'s a whole lot to discover in this editor. Let us help you settle in.</span>');
            expect(json.disclaimer).toEqual('<span style="white-space: pre-wrap;">No spam. Unsubscribe anytime.</span>');
        }));  
        it('handles headers with extra br', editorTest(function () {
            dataset.header = '<span style="white-space: pre-wrap;">Sign up for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span>';
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            const header = json.header;
            expect(header).toEqual('<span style="white-space: pre-wrap;">Sign up for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span>');
        }));
        it('loads and unwraps headers when wrapped with p', editorTest(function () {
            dataset.header = '<p><span style="white-space: pre-wrap;">Sign up for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span></p>';
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            const header = json.header;
            expect(header).toEqual('<span style="white-space: pre-wrap;">Sign up for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span>');
        }));
        it('allows br tags in subheaders', editorTest(function () {
            dataset.subheader = '<span>Product title!</span> <br><span>Hello part 2</span>';
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            const subheader = json.subheader;
            expect(subheader).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('can handle subheaders that are wrapped in p tags', editorTest(function () {
            dataset.subheader = '<p><span>Product title!</span> <br><span>Hello part 2</span></p>';
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            const subheader = json.subheader;
            expect(subheader).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('handles disclaimers with extra br', editorTest(function () {
            dataset.disclaimer = '<span style="white-space: pre-wrap;">No spam. </span><br><span style="white-space: pre-wrap;">Unsubscribe anytime.</span>';
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            const disclaimer = json.disclaimer;
            expect(disclaimer).toEqual('<span style="white-space: pre-wrap;">No spam. </span><br><span style="white-space: pre-wrap;">Unsubscribe anytime.</span>');
        }));
        it('loads and unwraps disclaimers when wrapped with p', editorTest(function () {
            dataset.disclaimer = '<p><span style="white-space: pre-wrap;">No spam. </span><br><span style="white-space: pre-wrap;">Unsubscribe anytime.</span></p>';
            const signupNode = $createSignupNode(dataset);
            const json = signupNode.exportJSON();
            const disclaimer = json.disclaimer;
            expect(disclaimer).toEqual('<span style="white-space: pre-wrap;">No spam. </span><br><span style="white-space: pre-wrap;">Unsubscribe anytime.</span>');
        }));
    });
});