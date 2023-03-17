import DarkModeToggle from './components/DarkModeToggle';
import FloatingButton from './components/FloatingButton';
import InitialContentToggle from './components/InitialContentToggle';
import React from 'react';
import Sidebar from './components/Sidebar';
import TitleTextBox from './components/TitleTextBox';
import Watermark from './components/Watermark';
import basicContent from './content/basic-content.json';
import content from './content/content.json';
import minimalContent from './content/minimal-content.json';
import {$getRoot, $isDecoratorNode} from 'lexical';
import {
    BASIC_NODES, BASIC_TRANSFORMERS, KoenigComposableEditor,
    KoenigComposer, KoenigEditor, MINIMAL_NODES, MINIMAL_TRANSFORMERS,
    RestrictContentPlugin
} from '../src';
import {defaultHeaders as defaultUnsplashHeaders} from './utils/unsplashConfig';
import {fileTypes, useFileUpload} from './utils/useFileUpload';
import {useLocation} from 'react-router-dom';
import {useSearchParams} from 'react-router-dom';
import {useState} from 'react';

const cardConfig = {
    unsplash: {defaultHeaders: defaultUnsplashHeaders}
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

function DemoEditor({editorType, registerAPI, cursorDidExitAtTop, darkMode}) {
    if (editorType === 'basic') {
        return (
            <KoenigComposableEditor
                cursorDidExitAtTop={cursorDidExitAtTop}
                markdownTransformers={BASIC_TRANSFORMERS}
                registerAPI={registerAPI}
            />
        );
    } else if (editorType === 'minimal') {
        return (
            <KoenigComposableEditor
                cursorDidExitAtTop={cursorDidExitAtTop}
                markdownTransformers={MINIMAL_TRANSFORMERS}
                registerAPI={registerAPI}
            >
                <RestrictContentPlugin paragraphs={1} />
            </KoenigComposableEditor>
        );
    }

    return (
        <KoenigEditor
            cursorDidExitAtTop={cursorDidExitAtTop}
            darkMode={darkMode}
            registerAPI={registerAPI}
        />
    );
}

function DemoApp({editorType}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarView, setSidebarView] = useState('json');

    const darkMode = searchParams.get('darkMode') === 'true';
    const hideContent = searchParams.get('content') === 'false';

    const defaultContent = React.useMemo(() => {
        return JSON.stringify(getDefaultContent({editorType}));
    }, [editorType]);

    const initialContent = React.useMemo(() => {
        return hideContent ? undefined : defaultContent;
    }, [hideContent, defaultContent]);

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

    function focusEditor(event) {
        const clickedOnDecorator = (event.target.closest('[data-lexical-decorator]') !== null) || event.target.hasAttribute('data-lexical-decorator');
        const clickedOnSlashMenu = (event.target.closest('[data-kg-slash-menu]') !== null) || event.target.hasAttribute('data-kg-slash-menu');

        if (editorAPI && !clickedOnDecorator && !clickedOnSlashMenu) {
            let editor = editorAPI.editorInstance;
            let {bottom} = editor._rootElement.getBoundingClientRect();

            // if a mousedown and subsequent mouseup occurs below the editor
            // canvas, focus the editor and put the cursor at the end of the document
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
    }

    function toggleDarkMode() {
        if (darkMode) {
            searchParams.delete('darkMode');
        } else {
            searchParams.set('darkMode', 'true');
        }
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

    const showTitle = !['basic', 'minimal'].includes(editorType);

    // used to force a re-initialization of the editor when URL changes, otherwise
    // content is memoized and causes issues when switching between editor types
    const location = useLocation();

    return (
        <div
            key={location.key}
            className={`koenig-lexical top`}
        >
            <KoenigComposer
                cardConfig={cardConfig}
                darkMode={darkMode}
                fileUploader={{useFileUpload, fileTypes}}
                initialEditorState={initialContent}
                nodes={getAllowedNodes({editorType})}
            >
                <div className={`relative h-full grow ${darkMode ? 'dark' : ''}`}>
                    {
                        searchParams !== 'false'
                            ? <InitialContentToggle defaultContent={defaultContent} searchParams={searchParams} setSearchParams={setSearchParams} setTitle={setTitle} />
                            : null
                    }
                    <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                    <div ref={containerRef} className="h-full overflow-auto" onClick={focusEditor}>
                        <div className="mx-auto max-w-[740px] py-[15vmin] px-6 lg:px-0">
                            { showTitle
                                ? <TitleTextBox ref={titleRef} editorAPI={editorAPI} setTitle={setTitle} title={title} />
                                : null
                            }
                            <DemoEditor
                                cursorDidExitAtTop={focusTitle}
                                darkMode={darkMode}
                                editorType={editorType}
                                registerAPI={setEditorAPI}
                            />
                        </div>
                    </div>
                </div>
                <Watermark
                    editorType={editorType || 'full'}
                />
                <div className="absolute z-20 flex h-full flex-col items-end sm:relative">
                    <Sidebar isOpen={isSidebarOpen} view={sidebarView} />
                    <FloatingButton isOpen={isSidebarOpen} onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
