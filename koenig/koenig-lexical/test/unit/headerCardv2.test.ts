import {$createHeaderNode, HeaderNode} from '../../src/nodes/HeaderNode';
const {createHeadlessEditor} = require('@lexical/headless');

const editorNodes = [HeaderNode];

describe('HeaderNode v2', function () {
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
            type: 'header',
            version: 2,
            size: 'small',
            style: 'dark',
            buttonEnabled: false,
            buttonUrl: '',
            buttonText: '',
            header: '<span style="white-space: pre-wrap;">Hello header</span><br><span style="white-space: pre-wrap;">On two lines, even.</span>',
            subheader: '<p dir="ltr"><span style="white-space: pre-wrap;">Subheadings are awesome</span><br><span style="white-space: pre-wrap;">I like them a lot.</span></p>',
            backgroundImageSrc: '',
            accentColor: '#ff0095',
            alignment: 'center',
            backgroundColor: '#000000',
            backgroundImageWidth: null,
            backgroundImageHeight: null,
            backgroundSize: 'cover',
            textColor: '#FFFFFF',
            buttonColor: '#ffffff',
            buttonTextColor: '#000000',
            layout: 'full',
            swapped: false
        };
    });

    describe('Content load and export testing', function () {     
        it('handles titles with extra br', editorTest(function () {
            dataset.header = '<span>Product title!</span> <br><span>Hello part 2</span>';
            const headerNode = $createHeaderNode(dataset);
            const json = headerNode.exportJSON();
            const heading = json.header;
            expect(heading).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('loads and unwraps headers when wrapped with p', editorTest(function () {
            dataset.header = '<p><span>Product title!</span> <br><span>Hello part 2</span></p>';
            const headerNode = $createHeaderNode(dataset);
            const json = headerNode.exportJSON();
            const heading = json.header;
            expect(heading).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('allows br tags in subheaders', editorTest(function () {
            dataset.subheader = '<span>Product title!</span> <br><span>Hello part 2</span>';
            const headerNode = $createHeaderNode(dataset);
            const json = headerNode.exportJSON();
            const subheading = json.subheader;
            expect(subheading).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('can handle subheaders that are wrapped in p tags', editorTest(function () {
            dataset.subheader = '<p><span>Product title!</span> <br><span>Hello part 2</span></p>';
            const headerNode = $createHeaderNode(dataset);
            const json = headerNode.exportJSON();
            const subheading = json.subheader;
            expect(subheading).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
    });
});