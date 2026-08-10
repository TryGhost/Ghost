import {dom, createDocument} from '../test-utils/index.js';
import {$getRoot, type LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {FileNode, $createFileNode, $isFileNode} from '../../src/index.js';

const editorNodes = [FileNode];

describe('FileNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: Record<string, unknown>;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

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
        expect($isFileNode(node)).toBe(true);
    }));

    describe('data access', function (){
        it('has getters from all properties', editorTest(function () {
            const node = $createFileNode(dataset);
            expect(node.src).toBe(dataset.src);
            expect(node.fileTitle).toBe(dataset.fileTitle);
            expect(node.fileSize).toBe(dataset.fileSize);
            expect(node.fileCaption).toBe(dataset.fileCaption);
            expect(node.fileName).toBe(dataset.fileName);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createFileNode(dataset);
            node.src = '/content/files/2023/03/IMG_0196.jpeg';
            expect(node.src).toBe('/content/files/2023/03/IMG_0196.jpeg');
            node.fileTitle = 'new title';
            expect(node.fileTitle).toBe('new title');
            node.fileSize = 123456;
            expect(node.fileSize).toBe(123456);
            expect(node.formattedFileSize).toBe('121 KB');
            node.fileCaption = 'new description';
            expect(node.fileCaption).toBe('new description');
            node.fileName = 'IMG_0196.jpeg';
            expect(node.fileName).toBe('IMG_0196.jpeg');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const node = $createFileNode(dataset);
            const fileNodeDataset = node.getDataset();
            expect(fileNodeDataset).toEqual(dataset);
        }));
    });

    describe('exportDOM', function () {
        it('creates a file card', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const {element} = fileNode.exportDOM(editor, exportOptions);
            expect((element as HTMLElement).outerHTML).toBe(`<div class="kg-card kg-file-card"><a class="kg-file-card-container" href="/content/files/2023/03/IMG_0196.jpeg" title="Download" download=""><div class="kg-file-card-contents"><div class="kg-file-card-title">Cool image to download</div><div class="kg-file-card-caption">This is a description</div><div class="kg-file-card-metadata"><div class="kg-file-card-filename">IMG_0196.jpeg</div><div class="kg-file-card-filesize">121 KB</div></div></div><div class="kg-file-card-icon"><svg viewBox="0 0 24 24"><defs><style>.a{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;}</style></defs><title>download-circle</title><polyline class="a" points="8.25 14.25 12 18 15.75 14.25"></polyline><line class="a" x1="12" y1="6.75" x2="12" y2="18"></line><circle class="a" cx="12" cy="12" r="11.25"></circle></svg></div></a></div>`);
        }));

        describe('email template', function () {
            beforeEach(function () {
                exportOptions.target = 'email';
                exportOptions.postUrl = 'https://example.com/post';
            });

            it('renders email template without title and caption', editorTest(function () {
                const minimalDataset = {
                    src: '/content/files/2023/03/IMG_0196.jpeg',
                    fileName: 'IMG_0196.jpeg',
                    fileSize: 123456
                };
                const fileNode = $createFileNode(minimalDataset);
                const {element} = fileNode.exportDOM(editor, exportOptions);
                const el = element as HTMLElement;

                // Should not have title
                expect(el.querySelector('.kg-file-title')).toBeNull();

                // Should not have caption
                expect(el.querySelector('.kg-file-description')).toBeNull();

                // Should have smaller icon
                const icon = el.querySelector('img') as HTMLImageElement;
                expect(icon.style.height).toBe('20px');
            }));
        });
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(FileNode.getType()).toBe('file');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const fileNodeDataset = fileNode.getDataset();
            const clone = FileNode.clone(fileNode) as FileNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...fileNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(FileNode.urlTransformMap).toEqual({
                src: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            expect(fileNode.hasEditMode()).toBe(true);
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
            const nodes = $generateNodesFromDOM(editor, document) as FileNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('/content/files/2023/03/IMG_0196.jpeg');
            expect(nodes[0].fileTitle).toBe('Cool image to download');
            expect(nodes[0].fileCaption).toBe('This is a description');
            expect(nodes[0].fileName).toBe('IMG_0196.jpeg');
            expect(nodes[0].fileSize).toBe(123904); // ~121 KB
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
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
                        const [fileNode] = $getRoot().getChildren() as FileNode[];
                        expect(fileNode.src).toBe('/content/files/2023/03/IMG_0196.jpeg');
                        expect(fileNode.fileTitle).toBe('Cool image to download');
                        expect(fileNode.fileCaption).toBe('This is a description');
                        expect(fileNode.fileName).toBe('IMG_0196.jpeg');
                        expect(fileNode.fileSize).toBe(123456);
                        expect(fileNode.formattedFileSize).toBe('121 KB'); // ~121 KB
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportJSON', function () {
        it('exports all data', editorTest(function () {
            const fileNode = $createFileNode(dataset);
            const json = fileNode.exportJSON();
            expect(json).toEqual({
                type: 'file',
                version: 1,
                ...dataset
            });
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createFileNode();
            expect(node.getTextContent()).toBe('');

            node.fileTitle = 'Testing';
            expect(node.getTextContent()).toBe('Testing\n\n');

            node.fileCaption = 'Test caption';
            expect(node.getTextContent()).toBe('Testing\nTest caption\n\n');
        }));
    });
});
