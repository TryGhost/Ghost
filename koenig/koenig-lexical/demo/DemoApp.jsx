import React from 'react';
import {KoenigComposer, KoenigEditor} from '../src';
import FloatingButton from './components/FloatingButton';
import SerializedStateTextarea from './components/SerializedStateTextarea';
import {useState} from 'react';
import Watermark from './components/Watermark';

function DemoApp() {
    const [sidebarState, setSidebarState] = useState(false);
    function openSidebar() {
        setSidebarState(!sidebarState);
    }

    return (
        <div className="koenig-lexical top">
            <KoenigComposer>
                <Watermark />
                <div className="h-full overflow-auto">
                    <div className="mx-auto h-full max-w-2xl pt-[15vmin]">
                        <KoenigEditor>
                        </KoenigEditor>
                    </div>
                </div>
                <div className={`absolute bottom-0 right-0 flex h-full max-w-md flex-col items-end gap-5 ${sidebarState ? 'w-full' : ''}`}>
                    <SerializedStateTextarea toggle={sidebarState} />
                    <FloatingButton onClick={openSidebar} />
                </div>
            </KoenigComposer>
        </div>
    );
}

export default DemoApp;
