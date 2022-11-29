import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import {useState} from 'react';
import Watermark from './components/Watermark';
import {imageUploader} from './utils/imageUploader';
import Sidebar from './components/Sidebar';
import content from './content/content.json';
import ToggleButton from './components/ToggleButton';

const loadContent = () => {
    if (import.meta.env.MODE !== 'test') {
        const cnt = JSON.stringify(content);
        return cnt;
    }
};

function DemoApp() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarView, setSidebarView] = useState('json');
    const [defaultContent, setDefaultContent] = useState(loadContent());
    const [title, setTitle] = useState(defaultContent ? 'Meet the Koenig editor.' : '');

    React.useEffect(() => {
        const contentJson = loadContent();
        setDefaultContent(contentJson);
    }, []);

    function openSidebar(view = 'json') {
        if (isSidebarOpen && sidebarView === view) {
            return setIsSidebarOpen(false);
        }
        setSidebarView(view);
        setIsSidebarOpen(true);
    }

    const handleTitleInput = (e) => {
        setTitle(e.target.value);
    };

    return (
        <div className="koenig-lexical top">
            <KoenigComposer initialEditorState={defaultContent} imageUploadFunction={{imageUploader}}>
                <Watermark />
                <div className="h-full grow overflow-auto">
                    <div className="mx-auto max-w-[740px] py-[15vmin]">
                        <textarea onChange={handleTitleInput} value={title} className="w-full min-w-[auto] mb-3 pb-1 text-black font-sans text-5xl font-bold resize-none overflow-hidden focus-visible:outline-none" placeholder="Post title" />
                        <KoenigEditor />
                    </div>
                </div>
                <ToggleButton setTitle={setTitle} content={defaultContent}/>
                <div className="flex h-full flex-col items-end">
                    <Sidebar isOpen={isSidebarOpen} view={sidebarView} />
                    <FloatingButton onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
