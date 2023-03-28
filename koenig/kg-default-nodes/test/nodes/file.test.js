// const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {FileNode, $createFileNode, $isFileNode} = require('../../');

const editorNodes = [FileNode];

describe('FileNode', function () {
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
        editor = createHeadlessEditor({
            nodes: editorNodes
        });
        dataset = {
            src: '/content/files/2023/03/IMG_0196.jpeg',
            title: 'Cool image to download',
            fileSize: '121 KB',
            description: 'This is a description',
            fileName: 'IMG_0196.jpeg'
        };
        exportOptions = {
            exportFormat: 'html',
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('can match node with FileNode', editorTest(function () {
        const node = $createFileNode(dataset);
        $isFileNode(node).should.be.true;
        // const node = $createCalloutNode(dataset);
        // $isCalloutNode(node).should.be.true;
    }));

    describe('data access', function (){
        it('has getters from all properties', editorTest(function () {
            const node = $createFileNode(dataset);
            node.getSrc().should.equal(dataset.src);
            node.getTitle().should.equal(dataset.title);
            node.getFileSize().should.equal(dataset.fileSize);
            node.getDescription().should.equal(dataset.description);
            node.getFileName().should.equal(dataset.fileName);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createFileNode(dataset);
            node.setSrc('/content/files/2023/03/IMG_0196.jpeg');
            node.getSrc().should.equal('/content/files/2023/03/IMG_0196.jpeg');
            node.setTitle('new title');
            node.getTitle().should.equal('new title');
            node.setFileSize(123456);
            node.getFileSize().should.equal('121 KB');
            node.setDescription('new description');
            node.getDescription().should.equal('new description');
            node.setFileName('IMG_0196.jpeg');
            node.getFileName().should.equal('IMG_0196.jpeg');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const node = $createFileNode(dataset);
            const fileNodeDataset = node.getDataset();
            fileNodeDataset.should.deepEqual(dataset);
        }));
    });

    describe('exportDom', function () {
        it('creates a file card', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const {element} = fileNode.exportDOM(exportOptions);
            element.outerHTML.should.equal(`<div class="kg-card kg-file-card"><a class="kg-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download=""><div class="kg-file-card-contents"><div class="kg-file-card-title">Cool image to download</div><div class="kg-file-card-caption">This is a description</div><div class="kg-file-card-metadata"><div class="kg-file-card-filename">IMG_0196.jpeg</div><div class="kg-file-card-filesize">121 KB</div></div></div><div class="kg-file-card-icon"><svg viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>download-circle</title><polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline><line class="a" x1="12" y1="6.75" x2="12" y2="18"></line><circle class="a" cx="12" cy="12" r="11.25"></circle></svg></div></a></div>`);
            
            // FIXME: battling to get it pretty printed.
        }));
    });

    describe('importDom', function () {
        it('parses a file card', editorTest(function () {
            const dom = (new JSDOM(`
                <div class="kg-card kg-file-card">
                    <a class="kg-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download="">
                        <div class="kg-file-card-contents">
                            <div class="kg-file-card-title">Cool image to download</div>
                            <div class="kg-file-card-caption">This is a description</div>
                            <div class="kg-file-card-metadata">
                                <div class="kg-file-card-filename">IMG_0196.jpeg</div>
                                <div class="kg-file-card-filesize">121 KB</div>
                            </div>
                        </div>
                        <div class="kg-file-card-icon">
                            <svg viewBox="0 0 24 24">
                                <defs>
                                    <style>
                                        .a {
                                            fill: none;
                                            stroke: currentColor;
                                            stroke-linecap: round;
                                            stroke-linejoin: round;
                                            stroke-width: 1.5px;
                                        }
                                    </style>
                                </defs>
                                <title>download-circle</title>
                                <polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline>
                                <line class="a" x1="12" y1="6.75" x2="12" y2="18"></line>
                                <circle class="a" cx="12" cy="12" r="11.25"></circle>
                            </svg>
                        </div>
                    </a>
                </div>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            nodes[0].getSrc().should.equal('/content/files/2023/03/IMG_0196.jpeg');
            nodes[0].getTitle().should.equal('Cool image to download');
            nodes[0].getDescription().should.equal('This is a description');
            nodes[0].getFileName().should.equal('IMG_0196.jpeg');
            nodes[0].getFileSize().should.equal('121 KB'); // ~121 KB
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'file',
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
                    const [fileNode] = $getRoot().getChildren();
                    fileNode.getSrc().should.equal('/content/files/2023/03/IMG_0196.jpeg');
                    fileNode.getTitle().should.equal('Cool image to download');
                    fileNode.getDescription().should.equal('This is a description');
                    fileNode.getFileName().should.equal('IMG_0196.jpeg');
                    fileNode.getFileSize().should.equal('121 KB');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const clonedNode = FileNode.clone(fileNode);
            $isFileNode(clonedNode).should.be.true();
            clonedNode.getSrc().should.equal('/content/files/2023/03/IMG_0196.jpeg');
            clonedNode.getTitle().should.equal('Cool image to download');
            clonedNode.getDescription().should.equal('This is a description');
            clonedNode.getFileName().should.equal('IMG_0196.jpeg');
            clonedNode.getFileSize().should.equal('121 KB');
        }));
    });

    describe('static props', function () {
        it('can get type', editorTest(function () {
            FileNode.getType().should.equal('file');
        }));
        it('can get urlTransformMap', editorTest(function () {
            FileNode.urlTransformMap.should.deepEqual({
                src: 'url'
            });
        }));
    });

    describe('exportJSON', function () {
        it('exports all data', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const json = fileNode.exportJSON();
            json.should.deepEqual({
                type: 'file',
                ...dataset
            });
        }));
    });
});
