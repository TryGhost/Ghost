import DarkModeToggle from './components/DarkModeToggle';
import FloatingButton from './components/FloatingButton';
import InitialContentToggle from './components/InitialContentToggle';
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
    MobiledocCopyPlugin,
    RestrictContentPlugin,
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

const cardConfig = {
    unsplash: {defaultHeaders: defaultUnsplashHeaders},
    fetchEmbed: fetchEmbed,
    tenor: tenorConfig,
    fetchAutocompleteLinks: () => Promise.resolve([
        {label: 'Homepage', value: window.location.origin + '/'},
        {label: 'Free signup', value: window.location.origin + '/#/portal/signup/free'}
    ]),
    fetchLabels: () => Promise.resolve(['Label 1', 'Label 2']),
    siteTitle: 'Koenig Lexical',
    siteDescription: `There's a whole lot to discover in this editor. Let us help you settle in.`,
    membersEnabled: true,
    feature: {
        collections: true,
        collectionsCard: true
    },
    deprecated: {
        headerV1: process.env.NODE_ENV === 'test' ? false : true // show header v1 only for tests
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

function DemoEditor({editorType, registerAPI, cursorDidExitAtTop, darkMode, setWordCount}) {
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
            <MobiledocCopyPlugin />
            <WordCountPlugin onChange={setWordCount} />
        </KoenigEditor>
    );
}

function DemoComposer({editorType, isMultiplayer, setWordCount}) {
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

        if (clickedOnDecorator || clickedOnSlashMenu) {
            skipFocusEditor.current = true;
        }
    }

    function focusEditor(event) {
        const clickedOnDecorator = (event.target.closest('[data-lexical-decorator]') !== null) || event.target.hasAttribute('data-lexical-decorator');
        const clickedOnSlashMenu = (event.target.closest('[data-kg-slash-menu]') !== null) || event.target.hasAttribute('data-kg-slash-menu');

        if (!skipFocusEditor.current && editorAPI && !clickedOnDecorator && !clickedOnSlashMenu) {
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

    return (
        <KoenigComposer
            cardConfig={{...cardConfig, snippets, createSnippet, deleteSnippet, collections, fetchCollectionPosts}}
            darkMode={darkMode}
            enableMultiplayer={isMultiplayer}
            fileUploader={{useFileUpload: useFileUpload({isMultiplayer}), fileTypes}}
            initialEditorState={initialContent}
            multiplayerDocId={`demo/${WEBSOCKET_ID}`}
            multiplayerEndpoint={WEBSOCKET_ENDPOINT}
            nodes={getAllowedNodes({editorType})}
        >
            <div className={`koenig-demo relative h-full grow ${darkMode ? 'dark' : ''}`} style={{'--kg-breakout-adjustment': isSidebarOpen ? '440px' : '0px'}}>
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

    // used to force a re-initialization of the editor when URL changes, otherwise
    // content is memoized and causes issues when switching between editor types
    const location = useLocation();

    return (
        <div
            key={location.key}
            className={`koenig-lexical top`}
        >
            {/* outside of DemoComposer to avoid re-renders and flaky tests when word count changes */}
            <WordCount wordCount={wordCount} />

            <MemoizedDemoComposer
                editorType={editorType}
                isMultiplayer={isMultiplayer}
                setWordCount={setWordCount}
            />
        </div>
    );
}

export default DemoApp;
