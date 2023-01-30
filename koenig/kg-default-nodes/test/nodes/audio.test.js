const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');

const {AudioNode, $createAudioNode, $isAudioNode} = require('../../');

const editorNodes = [AudioNode];

describe('AudioNode', function () {
    let editor;
    let dataset;
    let exportOptions;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
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
            src: '/content/audio/2022/11/koenig-lexical.mp3',
            title: 'Test Audio',
            duration: 60,
            mimeType: 'audio/mp3',
            thumbnailSrc: '/content/images/2022/11/koenig-audio-lexical.jpg'
        };

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isAudioNode', editorTest(function () {
        const audioNode = $createAudioNode(dataset);
        $isAudioNode(audioNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const audioNode = $createAudioNode(dataset);

            audioNode.getSrc().should.equal(dataset.src);
            audioNode.getTitle().should.equal(dataset.title);
            audioNode.getDuration().should.equal(dataset.duration);
            audioNode.getMimeType().should.equal(dataset.mimeType);
            audioNode.getThumbnailSrc().should.equal(dataset.thumbnailSrc);
        }));

        it('has setters for all properties', editorTest(function () {
            const audioNode = $createAudioNode();

            audioNode.getSrc().should.equal('');
            audioNode.setSrc('/content/audio/2022/12/koenig-lexical.mp3');
            audioNode.getSrc().should.equal('/content/audio/2022/12/koenig-lexical.mp3');

            audioNode.getTitle().should.equal('');
            audioNode.setTitle('Test Audio');
            audioNode.getTitle().should.equal('Test Audio');

            audioNode.getDuration().should.equal(0);
            audioNode.setDuration(70);
            audioNode.getDuration().should.equal(70);

            audioNode.getMimeType().should.equal('');
            audioNode.setMimeType('audio/mp3');
            audioNode.getMimeType().should.equal('audio/mp3');

            audioNode.getThumbnailSrc().should.equal('');
            audioNode.setThumbnailSrc('/content/images/2022/12/koenig-lexical.png');
            audioNode.getThumbnailSrc().should.equal('/content/images/2022/12/koenig-lexical.png');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const audioNodeDataset = audioNode.getDataset();

            audioNodeDataset.should.deepEqual({
                ...dataset
            });
        }));

        it('has isEmpty() convenience method', editorTest(function () {
            const audioNode = $createAudioNode(dataset);

            audioNode.isEmpty().should.be.false;
            audioNode.setSrc('');
            audioNode.isEmpty().should.be.true;
        }));
    });

    describe('exportDOM', function () {
        it('creates a audio card', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const {element} = audioNode.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <audio src="${dataset.src}"></audio>
            `);
        }));

        it('renders nothing with a missing src', editorTest(function () {
            const audioNode = $createAudioNode();
            const {element} = audioNode.exportDOM(exportOptions);

            element.textContent.should.equal('');
            should(element.outerHTML).be.undefined();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const json = audioNode.exportJSON();

            json.should.deepEqual({
                type: 'audio',
                version: 1,
                src: dataset.src,
                title: dataset.title,
                duration: dataset.duration,
                mimeType: dataset.mimeType,
                thumbnailSrc: dataset.thumbnailSrc
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'audio',
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
                    const [audioNode] = $getRoot().getChildren();

                    audioNode.getSrc().should.equal(dataset.src);
                    audioNode.getTitle().should.equal(dataset.title);
                    audioNode.getDuration().should.equal(dataset.duration);
                    audioNode.getMimeType().should.equal(dataset.mimeType);
                    audioNode.getThumbnailSrc().should.equal(dataset.thumbnailSrc);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            audioNode.hasEditMode().should.be.true;
        }));
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const clonedAudioNode = AudioNode.clone(audioNode);
            $isAudioNode(clonedAudioNode).should.be.true;
            clonedAudioNode.getSrc().should.equal(dataset.src);
        }));
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            AudioNode.getType().should.equal('audio');
        }));

        it('urlTransformMap', editorTest(function () {
            AudioNode.urlTransformMap.should.deepEqual({
                src: 'url'
            });
        }));
    });
});
