import {$createToggleNode, ToggleNode} from '../../src/nodes/ToggleNode';
const {createHeadlessEditor} = require('@lexical/headless');

const editorNodes = [ToggleNode];

describe('ToggleNode', function () {
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
            type: 'toggle',
            version: 1,
            heading: '<span style="white-space: pre-wrap;">Hello</span><br><span style="white-space: pre-wrap;">I am a two-line toggle</span>',
            content: '<p dir="ltr"><span style="white-space: pre-wrap;">And I\'m actually pretty awesome</span></p><p dir="ltr"><span style="white-space: pre-wrap;">If I do say so myself.</span></p><p dir="ltr"><span style="white-space: pre-wrap;">And I do.</span></p>'
        };
    });

    describe('Content load and export testing', function () {  
        it('handles "normal" content', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            const json = toggleNode.exportJSON();
            expect(json.heading).toEqual('<span style="white-space: pre-wrap;">Hello</span><br><span style="white-space: pre-wrap;">I am a two-line toggle</span>');
            expect(json.content).toEqual('<p><span style="white-space: pre-wrap;">And I\'m actually pretty awesome</span></p><p><span style="white-space: pre-wrap;">If I do say so myself.</span></p><p><span style="white-space: pre-wrap;">And I do.</span></p>');
        }));
        it('handles less messy html', editorTest(function () {
            dataset.heading = '<span>Hello</span>';
            dataset.content = '<p>And I\'m actually pretty awesome</p><p>If I do say so myself.</p><p>And I do.</p>';
            const toggleNode = $createToggleNode(dataset);
            const json = toggleNode.exportJSON();
            expect(json.heading).toEqual('<span style="white-space: pre-wrap;">Hello</span>');
            expect(json.content).toEqual('<p><span style="white-space: pre-wrap;">And I\'m actually pretty awesome</span></p><p><span style="white-space: pre-wrap;">If I do say so myself.</span></p><p><span style="white-space: pre-wrap;">And I do.</span></p>');
        }));
        it('handles headers with extra br', editorTest(function () {
            dataset.heading = '<span style="white-space: pre-wrap;">Toggle for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span>';
            const toggleNode = $createToggleNode(dataset);
            const json = toggleNode.exportJSON();
            expect(json.heading).toEqual('<span style="white-space: pre-wrap;">Toggle for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span>');
        }));
        it('loads and unwraps headers when wrapped with p', editorTest(function () {
            dataset.heading = '<p><span style="white-space: pre-wrap;">Toggle for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span></p>';
            const toggleNode = $createToggleNode(dataset);
            const json = toggleNode.exportJSON();
            expect(json.heading).toEqual('<span style="white-space: pre-wrap;">Toggle for </span><br><span style="white-space: pre-wrap;">Koenig Lexical</span>');
        }));
    });
});