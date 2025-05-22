const {dom, createDocument} = require('../test-utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
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
            fileTitle: 'Cool image to download',
            fileSize: 123456,
            fileCaption: 'This is a description',
            fileName: 'IMG_0196.jpeg'
        };
        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('can match node with FileNode', editorTest(function () {
        const node = $createFileNode(dataset);
        $isFileNode(node).should.be.true();
    }));

    describe('data access', function (){
        it('has getters from all properties', editorTest(function () {
            const node = $createFileNode(dataset);
            node.src.should.equal(dataset.src);
            node.fileTitle.should.equal(dataset.fileTitle);
            node.fileSize.should.equal(dataset.fileSize);
            node.fileCaption.should.equal(dataset.fileCaption);
            node.fileName.should.equal(dataset.fileName);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createFileNode(dataset);
            node.src = '/content/files/2023/03/IMG_0196.jpeg';
            node.src.should.equal('/content/files/2023/03/IMG_0196.jpeg');
            node.fileTitle = 'new title';
            node.fileTitle.should.equal('new title');
            node.fileSize = 123456;
            node.fileSize.should.equal(123456);
            node.formattedFileSize.should.equal('121 KB');
            node.fileCaption = 'new description';
            node.fileCaption.should.equal('new description');
            node.fileName = 'IMG_0196.jpeg';
            node.fileName.should.equal('IMG_0196.jpeg');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const node = $createFileNode(dataset);
            const fileNodeDataset = node.getDataset();
            fileNodeDataset.should.deepEqual(dataset);
        }));
    });

    describe('exportDOM', function () {
        it('creates a file card', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const {element} = fileNode.exportDOM(exportOptions);
            element.outerHTML.should.equal(`<div class="kg-card kg-file-card"><a class="kg-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download=""><div class="kg-file-card-contents"><div class="kg-file-card-title">Cool image to download</div><div class="kg-file-card-caption">This is a description</div><div class="kg-file-card-metadata"><div class="kg-file-card-filename">IMG_0196.jpeg</div><div class="kg-file-card-filesize">121 KB</div></div></div><div class="kg-file-card-icon"><svg viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>download-circle</title><polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline><line class="a" x1="12" y1="6.75" x2="12" y2="18"></line><circle class="a" cx="12" cy="12" r="11.25"></circle></svg></div></a></div>`);
        }));

        describe('email template', function () {
            beforeEach(function () {
                exportOptions.target = 'email';
                exportOptions.postUrl = 'https://example.com/post';
            });

            it('renders complete email template with all fields', editorTest(function () {
                const fileNode = $createFileNode(dataset);
                const {element} = fileNode.exportDOM(exportOptions);

                // Check basic structure
                element.tagName.should.equal('TABLE');
                element.className.should.equal('kg-file-card');

                // Check title is present and linked
                const titleLink = element.querySelector('.kg-file-title');
                titleLink.textContent.should.equal('Cool image to download');
                titleLink.closest('a').href.should.equal('https://example.com/post');

                // Check caption is present and linked
                const descriptionLink = element.querySelector('.kg-file-description');
                descriptionLink.textContent.should.equal('This is a description');
                descriptionLink.closest('a').href.should.equal('https://example.com/post');

                // Check metadata
                const metaLink = element.querySelector('.kg-file-meta');
                metaLink.innerHTML.should.containEql('IMG_0196.jpeg');
                metaLink.innerHTML.should.containEql('121 KB');

                // Check icon
                const icon = element.querySelector('img');
                icon.src.should.equal('https://static.ghost.org/v4.0.0/images/download-icon-darkmode.png');
                icon.style.height.should.equal('24px');
            }));

            it('renders email template without title and caption', editorTest(function () {
                const minimalDataset = {
                    src: '/content/files/2023/03/IMG_0196.jpeg',
                    fileName: 'IMG_0196.jpeg',
                    fileSize: 123456
                };
                const fileNode = $createFileNode(minimalDataset);
                const {element} = fileNode.exportDOM(exportOptions);

                // Should not have title
                should.not.exist(element.querySelector('.kg-file-title'));

                // Should not have caption
                should.not.exist(element.querySelector('.kg-file-description'));

                // Should have smaller icon
                const icon = element.querySelector('img');
                icon.style.height.should.equal('20px');
            }));

            it('properly escapes HTML in all fields', editorTest(function () {
                const datasetWithHtml = {
                    ...dataset,
                    fileTitle: 'Title with <script>alert("xss")</script>',
                    fileCaption: 'Caption with <strong>html</strong>',
                    fileName: 'file<.html'
                };
                const fileNode = $createFileNode(datasetWithHtml);
                const {element} = fileNode.exportDOM(exportOptions);

                const html = element.innerHTML;
                html.should.not.containEql('<script>');
                html.should.not.containEql('<strong>');
                html.should.containEql('file&lt;.html');
                html.should.containEql('Title with ');
                html.should.containEql('Caption with ');
            }));
        });
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            FileNode.getType().should.equal('file');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const fileNodeDataset = fileNode.getDataset();
            const clone = FileNode.clone(fileNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...fileNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            FileNode.urlTransformMap.should.deepEqual({
                src: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            fileNode.hasEditMode().should.be.true();
        }));
    });

    describe('importDOM', function () {
        it('parses a file card', editorTest(function () {
            const document = createDocument(`
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
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);
            nodes[0].src.should.equal('/content/files/2023/03/IMG_0196.jpeg');
            nodes[0].fileTitle.should.equal('Cool image to download');
            nodes[0].fileCaption.should.equal('This is a description');
            nodes[0].fileName.should.equal('IMG_0196.jpeg');
            nodes[0].fileSize.should.equal(123904); // ~121 KB
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
                    fileNode.src.should.equal('/content/files/2023/03/IMG_0196.jpeg');
                    fileNode.fileTitle.should.equal('Cool image to download');
                    fileNode.fileCaption.should.equal('This is a description');
                    fileNode.fileName.should.equal('IMG_0196.jpeg');
                    fileNode.fileSize.should.equal(123456);
                    fileNode.formattedFileSize.should.equal('121 KB'); // ~121 KB
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
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

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createFileNode();
            node.getTextContent().should.equal('');

            node.fileTitle = 'Testing';
            node.getTextContent().should.equal('Testing\n\n');

            node.fileCaption = 'Test caption';
            node.getTextContent().should.equal('Testing\nTest caption\n\n');
        }));
    });
});
