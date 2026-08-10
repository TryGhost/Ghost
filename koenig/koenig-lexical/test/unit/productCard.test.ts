import {$createProductNode, ProductNode} from '../../src/nodes/ProductNode';
const {createHeadlessEditor} = require('@lexical/headless');

const editorNodes = [ProductNode];

describe('ProductNode', function () {
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
            productImageSrc: '/content/images/2022/11/koenig-lexical.jpg',
            productImageWidth: 200,
            productImageHeight: 100,
            productTitle: 'This is a <b>title</b>',
            productDescription: 'This is a <b>description</b>',
            productRatingEnabled: true,
            productButtonEnabled: true,
            productButton: 'Button text',
            productUrl: 'https://google.com/'
        };
    });

    describe('load and export testing', function () {     
        it('handles titles with extra br', editorTest(function () {
            dataset.productTitle = '<span>Product title!</span> <br><span>Hello part 2</span>';
            const productNode = $createProductNode(dataset);
            const json = productNode.exportJSON();
            const title = json.productTitle;
            expect(title).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('loads and unwraps titles when wrapped with p', editorTest(function () {
            dataset.productTitle = '<p><span>Product title!</span> <br><span>Hello part 2</span></p>';
            const productNode = $createProductNode(dataset);
            const json = productNode.exportJSON();
            const title = json.productTitle;
            expect(title).toEqual('<span style="white-space: pre-wrap;">Product title!</span><br><span style="white-space: pre-wrap;">Hello part 2</span>');
        }));
        it('combines adjacent spans', editorTest(function () {
            dataset.productTitle = '<span>Product title!</span> <span>Hello part 2</span>';
            const productNode = $createProductNode(dataset);
            const json = productNode.exportJSON();
            const title = json.productTitle;
            expect(title).toEqual('<span style="white-space: pre-wrap;">Product title! Hello part 2</span>');
        }));
        it('handles italics correctly', editorTest(function () {
            dataset.productTitle = `<span style="white-space: pre-wrap;">Hello title</span><i><em class="italic" style="white-space: pre-wrap;"> land </em></i><span style="white-space: pre-wrap;">baaaabeee.</span>`;
            const productNode = $createProductNode(dataset);
            const json = productNode.exportJSON();
            const title = json.productTitle;
            expect(title).toEqual('<span style="white-space: pre-wrap;">Hello title</span><i><em style="white-space: pre-wrap;"> land </em></i><span style="white-space: pre-wrap;">baaaabeee.</span>');
        }));
    });
});