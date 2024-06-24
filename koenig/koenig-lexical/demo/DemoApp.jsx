import DarkModeToggle from './components/DarkModeToggle';
import DollarIcon from './assets/icons/kg-dollar.svg?react';
import FloatingButton from './components/FloatingButton';
import InitialContentToggle from './components/InitialContentToggle';
import LockIcon from './assets/icons/kg-lock.svg?react';
import React, {useState} from 'react';
import Sidebar from './components/Sidebar';
import TitleTextBox from './components/TitleTextBox';
import Watermark from './components/Watermark';
import WordCount from './components/WordCount';
import basicContent from './content/basic-content.json';
import content from './content/content.json';
import minimalContent from './content/minimal-content.json';
import {$getRoot, $isDecoratorNode} from 'lexical';
import {
    BASIC_NODES, BASIC_TRANSFORMERS, KoenigComposableEditor,
    KoenigComposer, KoenigEditor, MINIMAL_NODES, MINIMAL_TRANSFORMERS,
    RestrictContentPlugin,
    TKCountPlugin,
    WordCountPlugin
} from '../src';
import {defaultHeaders as defaultUnsplashHeaders} from './utils/unsplashConfig';
import {fetchEmbed} from './utils/fetchEmbed';
import {fileTypes, useFileUpload} from './utils/useFileUpload';
import {tenorConfig} from './utils/tenorConfig';
import {useCollections} from './utils/useCollections';
import {useLocation, useSearchParams} from 'react-router-dom';
import {useSnippets} from './utils/useSnippets';

const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const WEBSOCKET_ENDPOINT = params.get('multiplayerEndpoint') || 'ws://localhost:1234';
const WEBSOCKET_ID = params.get('multiplayerId') || '0';

const defaultCardConfig = {
    unsplash: defaultUnsplashHeaders,
    fetchEmbed: fetchEmbed,
    tenor: tenorConfig,
    fetchAutocompleteLinks: () => Promise.resolve([
        {label: 'Homepage', value: window.location.origin + '/'},
        {label: 'Free signup', value: window.location.origin + '/#/portal/signup/free'}
    ]),
    renderLabels: true,
    fetchLabels: () => Promise.resolve(['Label 1', 'Label 2']),
    siteTitle: 'Koenig Lexical',
    siteDescription: `There's a whole lot to discover in this editor. Let us help you settle in.`,
    membersEnabled: true,
    feature: {
        collections: true,
        collectionsCard: true,
        internalLinking: false // default off, can be enabled with `?labs=internalLinking
    },
    deprecated: {
        headerV1: process.env.NODE_ENV === 'test' ? false : true // show header v1 only for tests
    },
    searchLinks: async (term) => {
        // default to showing latest posts when search is empty
        // no delay to simulate posts being pre-loaded in editor
        if (!term) {
            return [
                {label: 'Latest posts', key: 'latest-posts', items: [
                    {id: '1', groupName: 'Latest posts', title: 'Remote Work\'s Impact on Job Markets and Employment', url: 'https://source.ghost.io/remote-works-impact-on-job-markets/', metaText: '8 May 2024', MetaIcon: LockIcon, metaIconTitle: 'Members only'},
                    {id: '2', groupName: 'Latest posts', title: 'Robotics Renaissance: How Automation is Transforming Industries', url: 'https://source-newsletter.ghost.io/mental-health-awareness-in-the-workplace/', metaText: '2 May 2024', MetaIcon: DollarIcon, metaIconTitle: 'Specific tiers only'},
                    {id: '3', groupName: 'Latest posts', title: 'Biodiversity Conservation in Fragile Ecosystems', url: 'https://source.ghost.io/biodiversity-conservation-in-fragile-ecosystems/', metaText: '26 June 2024', MetaIcon: DollarIcon, metaIconTitle: 'Paid-members only'},
                    {id: '4', groupName: 'Latest posts', title: 'Unveiling the Crisis of Plastic Pollution: Analyzing Its Profound Impact on the Environment', url: 'https://source.ghost.io/plastic-pollution-crisis-deepens/', metaText: '16 Aug 2023'}
                ]}
            ];
        }

        // actual search, simulate a network request delay
        return new Promise((resolve) => {
            setTimeout(() => {
                const posts = [
                    {id: '1', groupName: 'Posts', title: 'TK Reminders', url: 'https://ghost.org/changelog/tk-reminders/'},
                    {id: '2', groupName: 'Posts', title: '✨ Emoji autocomplete ✨', url: 'https://ghost.org/changelog/emoji-picker/'}
                ].filter(item => item.title.toLowerCase().includes(term.toLowerCase()));

                const pages = [
                    {id: '3', groupName: 'Pages', title: 'How to update Ghost', url: 'https://ghost.org/docs/update/'}
                ].filter(item => item.title.toLowerCase().includes(term.toLowerCase()));

                const tags = [
                    {id: '4', groupName: 'Tags', title: 'Improved', url: 'https://ghost.org/changelog/tag/improved/'}
                ].filter(item => item.title.toLowerCase().includes(term.toLowerCase()));

                const groups = [];

                if (posts.length) {
                    groups.push({label: 'Posts', key: 'posts', items: posts});
                }
                if (pages.length) {
                    groups.push({label: 'Pages', key: 'pages', items: pages});
                }
                if (tags.length) {
                    groups.push({label: 'Tags', key: 'tags', items: tags});
                }

                resolve(groups);
            }, 250);
        });
    }
};

function getDefaultContent({editorType}) {
    if (editorType === 'basic') {
        return basicContent;
    } else if (editorType === 'minimal') {
        return minimalContent;
    }
    return content;
}

function getAllowedNodes({editorType}) {
    if (editorType === 'basic') {
        return BASIC_NODES;
    } else if (editorType === 'minimal') {
        return MINIMAL_NODES;
    }
    return undefined;
}

function DemoEditor({editorType, registerAPI, cursorDidExitAtTop, darkMode, setWordCount, setTKCount}) {
    if (editorType === 'basic') {
        return (
            <KoenigComposableEditor
                cursorDidExitAtTop={cursorDidExitAtTop}
                markdownTransformers={BASIC_TRANSFORMERS}
                registerAPI={registerAPI}
            >
                <WordCountPlugin onChange={setWordCount} />
            </KoenigComposableEditor>
        );
    } else if (editorType === 'minimal') {
        return (
            <KoenigComposableEditor
                cursorDidExitAtTop={cursorDidExitAtTop}
                isSnippetsEnabled={false}
                markdownTransformers={MINIMAL_TRANSFORMERS}
                registerAPI={registerAPI}
            >
                <RestrictContentPlugin paragraphs={1} />
                <WordCountPlugin onChange={setWordCount} />
            </KoenigComposableEditor>
        );
    }

    return (
        <KoenigEditor
            cursorDidExitAtTop={cursorDidExitAtTop}
            darkMode={darkMode}
            registerAPI={registerAPI}
        >
            <WordCountPlugin onChange={setWordCount} />
            <TKCountPlugin onChange={setTKCount} />
        </KoenigEditor>
    );
}

function DemoComposer({editorType, isMultiplayer, setWordCount, setTKCount}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarView, setSidebarView] = useState('json');
    const {snippets, createSnippet, deleteSnippet} = useSnippets();
    const {collections, fetchCollectionPosts} = useCollections();

    const skipFocusEditor = React.useRef(false);

    const darkMode = searchParams.get('darkMode') === 'true';
    const contentParam = searchParams.get('content');

    const defaultContent = React.useMemo(() => {
        return JSON.stringify(getDefaultContent({editorType}));
    }, [editorType]);

    const initialContent = React.useMemo(() => {
        if (isMultiplayer) {
            return null;
        }

        if (contentParam === 'false') {
            return undefined;
        }

        return contentParam ? decodeURIComponent(contentParam) : defaultContent;
    }, [isMultiplayer, contentParam, defaultContent]);

    const [title, setTitle] = useState(initialContent ? 'Meet the Koenig editor.' : '');
    const [editorAPI, setEditorAPI] = useState(null);
    const titleRef = React.useRef(null);
    const containerRef = React.useRef(null);

    function openSidebar(view = 'json') {
        if (isSidebarOpen && sidebarView === view) {
            return setIsSidebarOpen(false);
        }
        setSidebarView(view);
        setIsSidebarOpen(true);
    }

    function focusTitle() {
        titleRef.current?.focus();
    }

    // mousedown can select a node which can deselect another node meaning the
    // mouseup/click event can occur outside of the initially clicked node, in
    // which case we don't want to then "re-focus" the editor and cause unexpected
    // selection changes
    function maybeSkipFocusEditor(event) {
        const clickedOnDecorator = (event.target.closest('[data-lexical-decorator]') !== null) || event.target.hasAttribute('data-lexical-decorator');
        const clickedOnSlashMenu = (event.target.closest('[data-kg-slash-menu]') !== null) || event.target.hasAttribute('data-kg-slash-menu');
        const clickedOnPortal = (event.target.closest('[data-kg-portal]') !== null) || event.target.hasAttribute('data-kg-portal');

        if (clickedOnDecorator || clickedOnSlashMenu || clickedOnPortal) {
            skipFocusEditor.current = true;
        }
    }

    function focusEditor(event) {
        const clickedOnDecorator = (event.target.closest('[data-lexical-decorator]') !== null) || event.target.hasAttribute('data-lexical-decorator');
        const clickedOnSlashMenu = (event.target.closest('[data-kg-slash-menu]') !== null) || event.target.hasAttribute('data-kg-slash-menu');
        const clickedOnPortal = (event.target.closest('[data-kg-portal]') !== null) || event.target.hasAttribute('data-kg-portal');

        if (!skipFocusEditor.current && editorAPI && !clickedOnDecorator && !clickedOnSlashMenu && !clickedOnPortal) {
            let editor = editorAPI.editorInstance;

            // if a mousedown and subsequent mouseup occurs below the editor
            // canvas, focus the editor and put the cursor at the end of the document
            let {bottom} = editor._rootElement.getBoundingClientRect();
            if (event.pageY > bottom && event.clientY > bottom) {
                event.preventDefault();

                // we should always have a visible cursor when focusing
                // at the bottom so create an empty paragraph if last
                // section is a card
                let addLastParagraph = false;

                editor.getEditorState().read(() => {
                    const lastNode = $getRoot().getChildren().at(-1);

                    if ($isDecoratorNode(lastNode)) {
                        addLastParagraph = true;
                    }
                });

                if (addLastParagraph) {
                    editorAPI.insertParagraphAtBottom();
                }

                // Focus the editor
                editorAPI.focusEditor({position: 'bottom'});

                //scroll to the bottom of the container
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        }

        skipFocusEditor.current = false;
    }

    function toggleDarkMode() {
        if (darkMode) {
            searchParams.delete('darkMode');
        } else {
            searchParams.set('darkMode', 'true');
        }
        setSearchParams(searchParams);
    }

    function saveContent() {
        const serializedState = editorAPI.serialize();
        const encodedContent = encodeURIComponent(serializedState);
        searchParams.set('content', encodedContent);
        setSearchParams(searchParams);
    }

    React.useEffect(() => {
        const handleFileDrag = (event) => {
            event.preventDefault();
        };

        const handleFileDrop = (event) => {
            if (event.dataTransfer.files.length > 0) {
                event.preventDefault();
                editorAPI?.insertFiles(Array.from(event.dataTransfer.files));
            }
        };

        window.addEventListener('dragover', handleFileDrag);
        window.addEventListener('drop', handleFileDrop);

        return () => {
            window.removeEventListener('dragover', handleFileDrag);
            window.removeEventListener('drop', handleFileDrop);
        };
    }, [editorAPI]);

    const showTitle = !isMultiplayer && !['basic', 'minimal'].includes(editorType);

    const cardConfig = {
        ...defaultCardConfig,
        snippets,
        createSnippet,
        deleteSnippet,
        collections,
        fetchCollectionPosts,
        feature: {
            ...defaultCardConfig.feature,
            internalLinking: searchParams.get('labs')?.includes('internalLinking'),
            internalLinkingAtLinks: searchParams.get('labs')?.includes('internalLinking')
        }
    };

    return (
        <KoenigComposer
            cardConfig={cardConfig}
            darkMode={darkMode}
            enableMultiplayer={isMultiplayer}
            fileUploader={{useFileUpload: useFileUpload({isMultiplayer}), fileTypes}}
            initialEditorState={initialContent}
            isTKEnabled={true} // TODO: can we move this onto <KoenigEditor>?
            multiplayerDocId={`demo/${WEBSOCKET_ID}`}
            multiplayerEndpoint={WEBSOCKET_ENDPOINT}
            nodes={getAllowedNodes({editorType})}
        >
            <div className={`koenig-demo relative h-full grow ${darkMode ? 'dark' : ''}`} style={isSidebarOpen ? {'--kg-breakout-adjustment': '440px'} : {}}>
                {
                    !isMultiplayer && searchParams !== 'false'
                        ? <InitialContentToggle defaultContent={defaultContent} searchParams={searchParams} setSearchParams={setSearchParams} setTitle={setTitle} />
                        : null
                }
                <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                <div ref={containerRef} className="h-full overflow-auto overflow-x-hidden" onClick={focusEditor} onMouseDown={maybeSkipFocusEditor}>
                    <div className="mx-auto max-w-[740px] px-6 py-[15vmin] lg:px-0">
                        {showTitle
                            ? <TitleTextBox ref={titleRef} editorAPI={editorAPI} setTitle={setTitle} title={title} />
                            : null
                        }
                        <DemoEditor
                            cursorDidExitAtTop={focusTitle}
                            darkMode={darkMode}
                            editorType={editorType}
                            registerAPI={setEditorAPI}
                            setTKCount={setTKCount}
                            setWordCount={setWordCount}
                        />
                    </div>
                </div>
            </div>
            <Watermark
                editorType={editorType || 'full'}
            />
            <div className="absolute z-20 flex h-full flex-col items-end sm:relative">
                <Sidebar isOpen={isSidebarOpen} saveContent={saveContent} view={sidebarView} />
                <FloatingButton isOpen={isSidebarOpen} onClick={openSidebar} />
            </div>
        </KoenigComposer>
    );
}

const MemoizedDemoComposer = React.memo(DemoComposer);

function DemoApp({editorType, isMultiplayer}) {
    const [wordCount, setWordCount] = useState(0);
    const [tkCount, setTKCount] = useState(0);

    // used to force a re-initialization of the editor when URL changes, otherwise
    // content is memoized and causes issues when switching between editor types
    const location = useLocation();

    return (
        <div
            key={location.key}
            className={`koenig-lexical top`}
        >
            {/* outside of DemoComposer to avoid re-renders and flaky tests when word count changes */}
            <WordCount tkCount={tkCount} wordCount={wordCount} />

            <MemoizedDemoComposer
                editorType={editorType}
                isMultiplayer={isMultiplayer}
                setTKCount={setTKCount}
                setWordCount={setWordCount}
            />
        </div>
    );
}

export default DemoApp;
