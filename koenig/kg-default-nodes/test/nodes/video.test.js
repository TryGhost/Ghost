const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {VideoNode, $createVideoNode, $isVideoNode} = require('../../');

const editorNodes = [VideoNode];

describe('VideoNode', function () {
    let editor;
    let dataset;

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
            src: '/content/images/2022/11/koenig-lexical.mp4',
            caption: 'This is a <b>caption</b>',
            width: 200,
            height: 100,
            duration: 60,
            thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg',
            thumbnailWidth: 250,
            thumbnailHeight: 150
        };
    });

    it('matches node with $isVideoNode', editorTest(function () {
        const videoNode = $createVideoNode(dataset);
        $isVideoNode(videoNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const videoNode = $createVideoNode(dataset);

            videoNode.getSrc().should.equal(dataset.src);
            videoNode.getCaption().should.equal(dataset.caption);
            videoNode.getVideoWidth().should.equal(dataset.width);
            videoNode.getVideoHeight().should.equal(dataset.height);
            videoNode.getDuration().should.equal(dataset.duration);
            videoNode.getThumbnailWidth().should.equal(dataset.thumbnailWidth);
            videoNode.getThumbnailHeight().should.equal(dataset.thumbnailHeight);
            videoNode.getThumbnailSrc().should.equal(dataset.thumbnailSrc);
            videoNode.getCardWidth().should.equal('regular');
            videoNode.getLoop().should.be.false;
        }));

        it('has setters for all properties', editorTest(function () {
            const videoNode = $createVideoNode();

            videoNode.getSrc().should.equal('');
            videoNode.setSrc('/content/images/2022/12/koenig-lexical.mp4');
            videoNode.getSrc().should.equal('/content/images/2022/12/koenig-lexical.mp4');

            videoNode.getCaption().should.equal('');
            videoNode.setCaption('Caption');
            videoNode.getCaption().should.equal('Caption');

            should(videoNode.getVideoWidth()).equal(null);
            videoNode.setVideoWidth(600);
            videoNode.getVideoWidth().should.equal(600);

            should(videoNode.getVideoHeight()).equal(null);
            videoNode.setVideoHeight(700);
            videoNode.getVideoHeight().should.equal(700);

            videoNode.getDuration().should.equal(0);
            videoNode.setDuration(70);
            videoNode.getDuration().should.equal(70);

            should(videoNode.getThumbnailWidth()).equal(null);
            videoNode.setThumbnailWidth(400);
            videoNode.getThumbnailWidth().should.equal(400);

            should(videoNode.getThumbnailHeight()).equal(null);
            videoNode.setThumbnailHeight(500);
            videoNode.getThumbnailHeight().should.equal(500);

            videoNode.getThumbnailSrc().should.equal('');
            videoNode.setThumbnailSrc('/content/images/2022/12/koenig-lexical.png');
            videoNode.getThumbnailSrc().should.equal('/content/images/2022/12/koenig-lexical.png');

            videoNode.getCardWidth().should.equal('regular');
            videoNode.setCardWidth('wide');
            videoNode.getCardWidth().should.equal('wide');

            videoNode.getLoop().should.be.false;
            videoNode.setLoop(true);
            videoNode.getLoop().should.be.true;
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const videoNode = $createVideoNode(dataset);
            const videoNodeDataset = videoNode.getDataset();

            videoNodeDataset.should.deepEqual({
                ...dataset,
                cardWidth: 'regular',
                loop: false
            });
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const videoNode = $createVideoNode(dataset);
            const json = videoNode.exportJSON();

            json.should.deepEqual({
                type: 'video',
                version: 1,
                src: dataset.src,
                caption: dataset.caption,
                width: dataset.width,
                height: dataset.height,
                duration: dataset.duration,
                thumbnailSrc: dataset.thumbnailSrc,
                thumbnailWidth: dataset.thumbnailWidth,
                thumbnailHeight: dataset.thumbnailHeight,
                cardWidth: dataset.cardWidth,
                loop: false
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
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
                    const [videoNode] = $getRoot().getChildren();

                    videoNode.getSrc().should.equal(dataset.src);
                    videoNode.getCaption().should.equal(dataset.caption);
                    videoNode.getVideoWidth().should.equal(dataset.width);
                    videoNode.getVideoHeight().should.equal(dataset.height);
                    videoNode.getDuration().should.equal(dataset.duration);
                    videoNode.getThumbnailWidth().should.equal(dataset.thumbnailWidth);
                    videoNode.getThumbnailHeight().should.equal(dataset.thumbnailHeight);
                    videoNode.getThumbnailSrc().should.equal(dataset.thumbnailSrc);
                    videoNode.getCardWidth().should.equal('wide');
                    videoNode.getLoop().should.be.true;

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
