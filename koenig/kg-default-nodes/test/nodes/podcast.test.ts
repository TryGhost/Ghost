import assert from 'node:assert/strict';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot, type LexicalEditor} from 'lexical';
import {dom} from '../test-utils/index.js';
import {PodcastNode, $createPodcastNode, $isPodcastNode, type ExportDOMOptions, type PodcastData} from '../../src/index.js';

const editorNodes = [PodcastNode];

describe('PodcastNode', function () {
    let editor: LexicalEditor;
    let dataset: PodcastData;
    let exportOptions: ExportDOMOptions;

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
            podcastId: 'podcast-1',
            episodeId: 'episode-1',
            podcastTitle: 'The Daily Awesome',
            title: 'Episode 1',
            description: 'The first episode',
            episodeUrl: 'https://example.com/episode-1.mp3',
            duration: '42:10',
            artworkUrl: 'https://example.com/artwork.jpg'
        };
        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isPodcastNode', editorTest(function () {
        const podcastNode = $createPodcastNode(dataset);
        assert.equal($isPodcastNode(podcastNode), true);
    }));

    describe('data access', function () {
        it('has getters and setters for all properties', editorTest(function () {
            const podcastNode = $createPodcastNode(dataset);

            assert.equal(podcastNode.podcastId, dataset.podcastId);
            assert.equal(podcastNode.episodeId, dataset.episodeId);
            assert.equal(podcastNode.podcastTitle, dataset.podcastTitle);
            assert.equal(podcastNode.title, dataset.title);
            assert.equal(podcastNode.description, dataset.description);
            assert.equal(podcastNode.episodeUrl, dataset.episodeUrl);
            assert.equal(podcastNode.duration, dataset.duration);
            assert.equal(podcastNode.artworkUrl, dataset.artworkUrl);

            podcastNode.title = 'Episode 2';
            assert.equal(podcastNode.title, 'Episode 2');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const podcastNode = $createPodcastNode(dataset);
            assert.deepEqual(podcastNode.getDataset(), dataset);
        }));
    });

    describe('isEmpty', function () {
        it('is empty when no data is set', editorTest(function () {
            assert.equal($createPodcastNode().isEmpty(), true);
        }));

        it('is not empty once an episode is picked', editorTest(function () {
            assert.equal($createPodcastNode({episodeId: 'episode-1'}).isEmpty(), false);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const podcastNode = $createPodcastNode(dataset);
            const json = podcastNode.exportJSON();

            assert.deepEqual(json, {
                type: 'podcast',
                version: 1,
                ...dataset
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'podcast',
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
                const [podcastNode] = $getRoot().getChildren() as PodcastNode[];

                assert.equal(podcastNode.title, dataset.title);
                assert.equal(podcastNode.episodeUrl, dataset.episodeUrl);
            });
        });
    });

    describe('exportDOM', function () {
        it('renders a placeholder figure', editorTest(function () {
            const podcastNode = $createPodcastNode(dataset);
            const {element, type} = podcastNode.exportDOM(editor, exportOptions);

            assert.equal(type, 'inner');
            assert.ok(element.innerHTML.includes('kg-podcast-card'));
            assert.ok(element.innerHTML.includes('Episode 1'));
            assert.ok(element.innerHTML.includes('The Daily Awesome'));
        }));
    });
});
