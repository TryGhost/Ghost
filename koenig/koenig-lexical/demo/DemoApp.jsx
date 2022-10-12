import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import SerializedStateTextarea from './components/SerializedStateTextarea';
import {useState} from 'react';
import Watermark from './components/Watermark';
import {imageUploader} from './utils/imageUploader';

function DemoApp() {
    const [sidebarState, setSidebarState] = useState(false);
    function openSidebar() {
        setSidebarState(!sidebarState);
    }

    return (
        <div className="koenig-lexical top">
            <KoenigComposer>
                <Watermark />
                <div className="h-full grow overflow-auto">
                    <div className="mx-auto h-full max-w-2xl pt-[15vmin]">
                        <KoenigEditor
                            imageUploadFunc={imageUploader}
                        />
                    </div>
                </div>
                <div className="flex h-full flex-col items-end">
                    <SerializedStateTextarea toggle={sidebarState} />
                    <FloatingButton onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
