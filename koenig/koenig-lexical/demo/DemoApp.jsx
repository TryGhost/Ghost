import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import {useState} from 'react';
import Watermark from './components/Watermark';
import {imageUploader} from './utils/imageUploader';
import {useImageUpload} from './utils/useImageUpload.js';
import Sidebar from './components/Sidebar';
import content from './content/content.json';
import ToggleButton from './components/ToggleButton';
import {useLocation} from 'react-router-dom';
import TitleTextBox from './components/TitleTextBox';
import {defaultHeaders as unsplashConfig} from './utils/unsplashConfig';
import {KoenigDecoratorNode} from '@tryghost/kg-default-nodes';

const loadContent = () => {
    const cnt = JSON.stringify(content);
    return cnt;
};

function useQuery() {
    const {search} = useLocation();

    return React.useMemo(() => new URLSearchParams(search), [search]);
}

function DemoApp() {
    let query = useQuery();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarView, setSidebarView] = useState('json');
    const [defaultContent] = useState(query.get('content') !== 'false' ? loadContent() : undefined);
    const [title, setTitle] = useState(defaultContent ? 'Meet the Koenig editor.' : '');
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
        const clickedOnDecorator = (event.target.closest('[data-lexical-decorator]') !== null) || event.target.hasAttribute('data-lixical-decorator');
        const clickedOnSlashMenu = (event.target.closest('[data-kg-slash-menu]') !== null) || event.target.hasAttribute('data-kg-slash-menu');
        if (editorAPI && !clickedOnDecorator && !clickedOnSlashMenu) {
            let editor = editorAPI.editorInstance;
            let {bottom} = editor._rootElement.getBoundingClientRect();

            // if a mousedown and subsequent mouseup occurs below the editor
            // canvas, focus the editor and put the cursor at the end of the
            // documentyarn
            if (event.pageY > bottom && event.clientY > bottom) {
                event.preventDefault();

                // we should always have a visible cursor when focusing
                // at the bottom so create an empty paragraph if last
                // section is a card
                const lastNode = Array.from(editor._editorState._nodeMap).pop()[1];
                if (lastNode instanceof KoenigDecoratorNode) {
                    editorAPI.insertParagraphAtBottom();
                }

                // Focus the editor
                editorAPI.focusEditor({position: 'bottom'});

                //scroll to the bottom of the container
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }   
        }
    }

    return (
        <div 
            className="koenig-lexical top"
        >
            <KoenigComposer
                initialEditorState={defaultContent}
                imageUploadFunction={{imageUploader, useImageUpload}}
                unsplashConfig={unsplashConfig}>
                <div className="relative h-full grow">
                    {
                        query.get('content') !== 'false'
                            ? <ToggleButton setTitle={setTitle} content={defaultContent}/>
                            : null
                    }
                    <div className="h-full overflow-auto" ref={containerRef} onClick={focusEditor}>
                        <div className="mx-auto max-w-[740px] py-[15vmin] px-6 lg:px-0">
                            <TitleTextBox title={title} setTitle={setTitle} editorAPI={editorAPI} ref={titleRef} />
                            <KoenigEditor
                                registerAPI={setEditorAPI}
                                cursorDidExitAtTop={focusTitle}
                            />
                        </div>
                    </div>
                </div>
                <Watermark />
                <div className="absolute z-20 flex h-full flex-col items-end sm:relative">
                    <Sidebar isOpen={isSidebarOpen} view={sidebarView} />
                    <FloatingButton isOpen={isSidebarOpen} onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
