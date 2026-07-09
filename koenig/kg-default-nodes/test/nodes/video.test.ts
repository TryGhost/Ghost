import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot, LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {VideoNode, $createVideoNode, $isVideoNode, type ExportDOMOptions} from '../../src/index.js';
import {$generateNodesFromDOM} from '@lexical/html';

const editorNodes = [VideoNode];

describe('VideoNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: ExportDOMOptions;

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
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            src: '/content/images/2022/11/koenig-lexical.mp4',
            caption: 'This is a <b>caption</b>',
            fileName: 'koenig-lexical.mp4',
            mimeType: 'video/mp4',
            width: 200,
            height: 100,
            duration: 60,
            thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg',
            customThumbnailSrc: '/content/images/2022/11/koenig-lexical-custom.jpg',
            thumbnailWidth: 100,
            thumbnailHeight: 50
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isVideoNode', editorTest(function () {
        const videoNode = $createVideoNode(dataset);
        expect($isVideoNode(videoNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const videoNode = $createVideoNode(dataset);

            expect(videoNode.src).toBe(dataset.src);
            expect(videoNode.caption).toBe(dataset.caption);
            expect(videoNode.fileName).toBe(dataset.fileName);
            expect(videoNode.mimeType).toBe(dataset.mimeType);
            expect(videoNode.width!).toBe(dataset.width);
            expect(videoNode.height!).toBe(dataset.height);
            expect(videoNode.duration).toBe(dataset.duration);
            expect(videoNode.thumbnailSrc).toBe(dataset.thumbnailSrc);
            expect(videoNode.customThumbnailSrc).toBe(dataset.customThumbnailSrc);
            expect(videoNode.thumbnailWidth!).toBe(dataset.thumbnailWidth);
            expect(videoNode.thumbnailHeight!).toBe(dataset.thumbnailHeight);
            expect(videoNode.cardWidth).toBe('regular');
            expect(videoNode.loop).toBe(false);
        }));

        it('can be created without a dataset', editorTest(function () {
            const videoNode = $createVideoNode();

            expect(videoNode.getDataset()).toEqual({
                src: '',
                caption: '',
                fileName: '',
                mimeType: '',
                width: null,
                height: null,
                duration: 0,
                thumbnailSrc: '',
                customThumbnailSrc: '',
                thumbnailWidth: null,
                thumbnailHeight: null,
                cardWidth: 'regular',
                loop: false
            });
        }));

        it('has setters for all properties', editorTest(function () {
            const videoNode = $createVideoNode({} as Record<string, unknown>);

            expect(videoNode.src).toBe('');
            videoNode.src = '/content/images/2022/12/koenig-lexical.mp4';
            expect(videoNode.src).toBe('/content/images/2022/12/koenig-lexical.mp4');

            expect(videoNode.caption).toBe('');
            videoNode.caption = 'Caption';
            expect(videoNode.caption).toBe('Caption');

            expect(videoNode.fileName).toBe('');
            videoNode.fileName = 'koenig-lexical.mp4';
            expect(videoNode.fileName).toBe('koenig-lexical.mp4');

            expect(videoNode.mimeType).toBe('');
            videoNode.mimeType = 'video/mp4';
            expect(videoNode.mimeType).toBe('video/mp4');

            expect(videoNode.width).toBe(null);
            videoNode.width = 600;
            expect(videoNode.width).toBe(600);

            expect(videoNode.height).toBe(null);
            videoNode.height = 700;
            expect(videoNode.height).toBe(700);

            expect(videoNode.duration).toBe(0);
            videoNode.duration = 70;
            expect(videoNode.duration).toBe(70);

            expect(videoNode.thumbnailSrc).toBe('');
            videoNode.thumbnailSrc = '/content/images/2022/12/koenig-lexical.png';
            expect(videoNode.thumbnailSrc).toBe('/content/images/2022/12/koenig-lexical.png');

            expect(videoNode.customThumbnailSrc).toBe('');
            videoNode.customThumbnailSrc = '/content/images/2022/12/koenig-lexical-custom.png';
            expect(videoNode.customThumbnailSrc).toBe('/content/images/2022/12/koenig-lexical-custom.png');

            expect(videoNode.thumbnailWidth).toBe(null);
            videoNode.thumbnailWidth = 100;
            expect(videoNode.thumbnailWidth).toBe(100);

            expect(videoNode.thumbnailHeight).toBe(null);
            videoNode.thumbnailHeight = 200;
            expect(videoNode.thumbnailHeight).toBe(200);

            expect(videoNode.cardWidth).toBe('regular');
            videoNode.cardWidth = 'wide';
            expect(videoNode.cardWidth).toBe('wide');

            expect(videoNode.loop).toBe(false);
            videoNode.loop = true;
            expect(videoNode.loop).toBe(true);
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const videoNode = $createVideoNode(dataset);
            const videoNodeDataset = videoNode.getDataset();

            expect(videoNodeDataset).toEqual({
                ...dataset,
                cardWidth: 'regular',
                loop: false
            });
        }));

        it('can format duration', editorTest(function () {
            const videoNode = $createVideoNode(dataset);

            videoNode.duration = 60;
            expect(videoNode.formattedDuration).toBe('1:00');

            videoNode.duration = 30;
            expect(videoNode.formattedDuration).toBe('0:30');

            videoNode.duration = 0;
            expect(videoNode.formattedDuration).toBe('0:00');

            videoNode.duration = 78;
            expect(videoNode.formattedDuration).toBe('1:18');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const videoNode = $createVideoNode(dataset);
            const json = videoNode.exportJSON();

            expect(json).toEqual({
                type: 'video',
                version: 1,
                src: dataset.src,
                caption: dataset.caption,
                fileName: dataset.fileName,
                mimeType: dataset.mimeType,
                width: dataset.width,
                height: dataset.height,
                duration: dataset.duration,
                thumbnailSrc: dataset.thumbnailSrc,
                customThumbnailSrc: dataset.customThumbnailSrc,
                thumbnailWidth: dataset.thumbnailWidth,
                thumbnailHeight: dataset.thumbnailHeight,
                cardWidth: dataset.cardWidth,
                loop: false
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'video',
                            ...dataset,
                            cardWidth: 'wide',
                            loop: true
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
                        const [videoNode] = $getRoot().getChildren() as VideoNode[];

                        expect(videoNode.src).toBe(dataset.src);
                        expect(videoNode.caption).toBe(dataset.caption);
                        expect(videoNode.fileName).toBe(dataset.fileName);
                        expect(videoNode.mimeType).toBe(dataset.mimeType);
                        expect(videoNode.width!).toBe(dataset.width);
                        expect(videoNode.height!).toBe(dataset.height);
                        expect(videoNode.duration).toBe(dataset.duration);
                        expect(videoNode.thumbnailSrc).toBe(dataset.thumbnailSrc);
                        expect(videoNode.customThumbnailSrc).toBe(dataset.customThumbnailSrc);
                        expect(videoNode.thumbnailWidth!).toBe(dataset.thumbnailWidth);
                        expect(videoNode.thumbnailHeight!).toBe(dataset.thumbnailHeight);
                        expect(videoNode.cardWidth).toBe('wide');
                        expect(videoNode.loop).toBe(true);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportDOM', function () {
        it('renders', editorTest(function () {
            const payload = {
                src: '/content/images/2022/11/koenig-lexical.mp4',
                width: 200,
                height: 100,
                duration: 60,
                thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg'
            };
            const videoNode = $createVideoNode(payload);
            const {element} = videoNode.exportDOM(editor, exportOptions);

            assertPrettifiesTo((element as HTMLElement).outerHTML, html`
                <figure class="kg-card kg-video-card kg-width-regular" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail="">
                    <div class="kg-video-container">
                        <video
                            src="/content/images/2022/11/koenig-lexical.mp4"
                            poster="https://img.spacergif.org/v1/200x100/0a/spacer.png"
                            width="200"
                            height="100"
                            playsinline=""
                            preload="metadata"
                            style="background: transparent url('/content/images/2022/11/koenig-lexical.jpg') 50% 50% / cover no-repeat;"
                        ></video>
                        <div class="kg-video-overlay">
                            <button class="kg-video-large-play-icon" aria-label="Play video">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="kg-video-player-container">
                            <div class="kg-video-player">
                                <button class="kg-video-play-icon" aria-label="Play video">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path>
                                    </svg>
                                </button>
                                <button class="kg-video-pause-icon kg-video-hide" aria-label="Pause video">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                        <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                    </svg>
                                </button>
                                <span class="kg-video-current-time">0:00</span>
                                <div class="kg-video-time">
                                    /<span class="kg-video-duration">1:00</span>
                                </div>
                                <input type="range" class="kg-video-seek-slider" max="100" value="0">
                                <button class="kg-video-playback-rate" aria-label="Adjust playback speed">1×</button>
                                <button class="kg-video-unmute-icon" aria-label="Unmute">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path>
                                    </svg>
                                </button>
                                <button class="kg-video-mute-icon kg-video-hide" aria-label="Mute">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path>
                                    </svg>
                                </button>
                                <input type="range" class="kg-video-volume-slider" max="100" value="100">
                            </div>
                        </div>
                    </div>
                </figure>
            `);
        }));

        it('renders for email target', editorTest(function () {
            const payload = {
                src: '/content/images/2022/11/koenig-lexical.mp4',
                width: 200,
                height: 100,
                duration: 60,
                thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg'
            };

            const options = {
                target: 'email',
                postUrl: 'https://example.com/my-post'
            };
            const videoNode = $createVideoNode(payload);
            const {element} = videoNode.exportDOM(editor, {...exportOptions, ...options});
            const output = (element as HTMLElement).outerHTML;

            expect(output).not.toContain('<video');
            expect(output).toContain('<figure class="kg-card kg-video-card kg-width-regular"');
            expect(output).toContain('<a class="kg-video-preview" href="https://example.com/my-post"');
            expect(output).toContain('background="/content/images/2022/11/koenig-lexical.jpg"');
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const videoNode = $createVideoNode(dataset);
            expect(videoNode.hasEditMode()).toBe(true);
        }));
    });

    describe('importDOM', function () {
        it('parses video card', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-video-card kg-width-regular" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail=""> <div class="kg-video-container"> <video src="/content/images/2022/11/koenig-lexical.mp4" poster="https://img.spacergif.org/v1/200x100/0a/spacer.png" width="200" height="100" playsinline="" preload="metadata" style="background: transparent url('/content/images/2022/11/koenig-lexical.jpg') 50% 50% / cover no-repeat;" ></video> <div class="kg-video-overlay"> <button class="kg-video-large-play-icon" aria-label="Play video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path> </svg> </button> </div><div class="kg-video-player-container"> <div class="kg-video-player"> <button class="kg-video-play-icon" aria-label="Play video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path> </svg> </button> <button class="kg-video-pause-icon kg-video-hide" aria-label="Pause video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect> <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect> </svg> </button> <span class="kg-video-current-time">0:00</span> <div class="kg-video-time"> /<span class="kg-video-duration">1:00</span> </div><input type="range" class="kg-video-seek-slider" max="100" value="0"> <button class="kg-video-playback-rate" aria-label="Adjust playback speed">1×</button> <button class="kg-video-unmute-icon" aria-label="Unmute"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path> </svg> </button> <button class="kg-video-mute-icon kg-video-hide" aria-label="Mute"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path> </svg> </button> <input type="range" class="kg-video-volume-slider" max="100" value="100"> </div></div></div><figcaption>Video caption</figcaption></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as VideoNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('/content/images/2022/11/koenig-lexical.mp4');
            expect(nodes[0].width!).toBe(200);
            expect(nodes[0].height!).toBe(100);
            expect(nodes[0].thumbnailSrc).toBe('/content/images/2022/11/koenig-lexical.jpg');
            expect(nodes[0].customThumbnailSrc).toBe('');
            expect(nodes[0].duration).toBe(60);
            expect(nodes[0].loop).toBe(false);
            expect(nodes[0].caption).toBe('Video caption');
            expect(nodes[0].cardWidth).toBe('regular');
        }));

        it('parses video card without caption', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-video-card kg-width-regular" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail=""> <div class="kg-video-container"> <video src="/content/images/2022/11/koenig-lexical.mp4" poster="https://img.spacergif.org/v1/200x100/0a/spacer.png" width="200" height="100" playsinline="" preload="metadata" style="background: transparent url('/content/images/2022/11/koenig-lexical.jpg') 50% 50% / cover no-repeat;" ></video> <div class="kg-video-overlay"> <button class="kg-video-large-play-icon" aria-label="Play video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path> </svg> </button> </div><div class="kg-video-player-container"> <div class="kg-video-player"> <button class="kg-video-play-icon" aria-label="Play video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path> </svg> </button> <button class="kg-video-pause-icon kg-video-hide" aria-label="Pause video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect> <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect> </svg> </button> <span class="kg-video-current-time">0:00</span> <div class="kg-video-time"> /<span class="kg-video-duration">1:00</span> </div><input type="range" class="kg-video-seek-slider" max="100" value="0"> <button class="kg-video-playback-rate" aria-label="Adjust playback speed">1×</button> <button class="kg-video-unmute-icon" aria-label="Unmute"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path> </svg> </button> <button class="kg-video-mute-icon kg-video-hide" aria-label="Mute"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path> </svg> </button> <input type="range" class="kg-video-volume-slider" max="100" value="100"> </div></div></div></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as VideoNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].caption).toBe('');
        }));

        it('parses video card with custom thumbnail', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-video-card kg-width-regular" data-kg-thumbnail="" data-kg-custom-thumbnail="/content/images/2022/11/koenig-lexical-custom.jpg"> <div class="kg-video-container"> <video src="/content/images/2022/11/koenig-lexical.mp4" poster="https://img.spacergif.org/v1/200x100/0a/spacer.png" width="200" height="100" playsinline="" preload="metadata" style="background: transparent url('/content/images/2022/11/koenig-lexical.jpg') 50% 50% / cover no-repeat;" ></video> <div class="kg-video-overlay"> <button class="kg-video-large-play-icon" aria-label="Play video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path> </svg> </button> </div><div class="kg-video-player-container"> <div class="kg-video-player"> <button class="kg-video-play-icon" aria-label="Play video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path> </svg> </button> <button class="kg-video-pause-icon kg-video-hide" aria-label="Pause video"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect> <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect> </svg> </button> <span class="kg-video-current-time">0:00</span> <div class="kg-video-time"> /<span class="kg-video-duration">1:00</span> </div><input type="range" class="kg-video-seek-slider" max="100" value="0"> <button class="kg-video-playback-rate" aria-label="Adjust playback speed">1×</button> <button class="kg-video-unmute-icon" aria-label="Unmute"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path> </svg> </button> <button class="kg-video-mute-icon kg-video-hide" aria-label="Mute"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"> <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path> </svg> </button> <input type="range" class="kg-video-volume-slider" max="100" value="100"> </div></div></div></figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as VideoNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].thumbnailSrc).toBe('');
            expect(nodes[0].customThumbnailSrc).toBe('/content/images/2022/11/koenig-lexical-custom.jpg');
        }));

        it('parses video card without width and height', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-video-card kg-width-regular" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail="">
                    <div class="kg-video-container">
                        <video src="/content/images/2022/11/koenig-lexical.mp4" playsinline="" preload="metadata" style="background: transparent url('/content/images/2022/11/koenig-lexical.jpg') 50% 50% / cover no-repeat;"></video>
                        <div class="kg-video-overlay"></div>
                        <div class="kg-video-player-container">
                            <div class="kg-video-player">
                                <div class="kg-video-time">/<span class="kg-video-duration">1:00</span></div>
                            </div>
                        </div>
                    </div>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as VideoNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].width).toBe(null);
            expect(nodes[0].height).toBe(null);
        }));

        it('parses wide card width from the figure container', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-video-card kg-width-wide" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail="">
                    <div class="kg-video-container">
                        <video src="/content/images/2022/11/koenig-lexical.mp4" width="200" height="100"></video>
                        <div class="kg-video-player-container">
                            <div class="kg-video-player">
                                <div class="kg-video-time">/<span class="kg-video-duration">1:00</span></div>
                            </div>
                        </div>
                    </div>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as VideoNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].cardWidth).toBe('wide');
        }));

        it('ignores malformed duration strings', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-video-card kg-width-regular" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail="">
                    <div class="kg-video-container">
                        <video src="/content/images/2022/11/koenig-lexical.mp4" width="200" height="100"></video>
                        <div class="kg-video-player-container">
                            <div class="kg-video-player">
                                <div class="kg-video-time">/<span class="kg-video-duration">abc:12</span></div>
                            </div>
                        </div>
                    </div>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as VideoNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].duration).toBe(0);
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createVideoNode({} as Record<string, unknown>);
            expect(node.getTextContent()).toBe('');

            node.caption = 'Test caption';
            expect(node.getTextContent()).toBe('Test caption\n\n');
        }));
    });
});
