import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import {useState} from 'react';
import Watermark from './components/Watermark';
import {imageUploader} from './utils/imageUploader';
import Sidebar from './components/Sidebar';
import content from './content/content.json';
import ToggleButton from './components/ToggleButton';
import {useLocation} from 'react-router-dom';
import TitleTextBox from './components/TitleTextBox';

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
                <div className="h-full grow relative">
                    {
                        query.get('content') !== 'false' ?
                            <ToggleButton setTitle={setTitle} content={defaultContent}/> : null
                    }
                    <div className="h-full overflow-auto">
                        <div className="mx-auto max-w-[740px] py-[15vmin]">
                            <TitleTextBox handleTitleInput={handleTitleInput} title={title} />
                            {/* <textarea onKeyDown={handleTitleKeyDown} ref={titleEl} onChange={handleTitleInput} value={title} className="w-full min-w-[auto] mb-3 pb-1 text-black font-sans text-5xl font-bold resize-none overflow-hidden focus-visible:outline-none" placeholder="Post title" /> */}
                            <KoenigEditor />
                        </div>
                    </div>
                </div>
                <div className="flex h-full flex-col items-end">
                    <Sidebar isOpen={isSidebarOpen} view={sidebarView} />
                    <FloatingButton onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
